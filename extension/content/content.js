// content/content.js

/**
 * Image Text Reader Content Script
 * Handles image detection, selection, and overlay management
 */

// TTS Manager class (inlined from utils/tts.js)
class TTSManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.currentText = "";
        this.isPlaying = false;
        this.currentWord = "";
        this.wordIndex = 0;
        this.words = [];
        this.onWordChange = null;
        this.onEnd = null;
    }

    /**
     * Get all available voices
     * @returns {Promise<Array<SpeechSynthesisVoice>>} - Array of available voices
     */
    async getVoices() {
        // If voices are already available, return them
        if (this.synth.getVoices().length > 0) {
            return this.synth.getVoices();
        }

        // Otherwise, wait for the voiceschanged event
        return new Promise((resolve) => {
            this.synth.onvoiceschanged = () => {
                resolve(this.synth.getVoices());
            };
        });
    }

    /**
     * Start speaking text
     * @param {string} text - The text to speak
     * @param {Object} options - TTS options
     * @param {number} options.rate - Speech rate (0.5 to 2.0)
     * @param {string} options.voiceName - Name of the voice to use
     * @param {Function} options.onWordChange - Callback when current word changes
     * @param {Function} options.onEnd - Callback when speech ends
     */
    speak(text, options = {}) {
        // Cancel any ongoing speech
        this.stop();

        // Store the text and callbacks
        this.currentText = text;
        this.onWordChange = options.onWordChange;
        this.onEnd = options.onEnd;

        // Split text into words for highlighting
        this.words = text.split(/\s+/);
        this.wordIndex = 0;

        // Create a new utterance
        this.utterance = new SpeechSynthesisUtterance(text);

        // Set rate if provided, otherwise use default (1.0)
        this.utterance.rate = options.rate || 1.0;

        // Set voice if provided
        if (options.voiceName) {
            const voices = this.synth.getVoices();
            const voice = voices.find((v) => v.name === options.voiceName);
            if (voice) {
                this.utterance.voice = voice;
            }
        }

        // Set up event handlers
        this.utterance.onboundary = (event) => {
            if (event.name === "word") {
                // Calculate which word is being spoken based on character index
                const upToIndex = this.currentText.substring(
                    0,
                    event.charIndex
                );
                this.wordIndex = upToIndex.split(/\s+/).length - 1;
                this.currentWord = this.words[this.wordIndex];

                // Call the onWordChange callback if provided
                if (
                    this.onWordChange &&
                    typeof this.onWordChange === "function"
                ) {
                    this.onWordChange(this.currentWord, this.wordIndex);
                }
            }
        };

        this.utterance.onend = () => {
            this.isPlaying = false;

            // Call the onEnd callback if provided
            if (this.onEnd && typeof this.onEnd === "function") {
                this.onEnd();
            }
        };

        // Start speaking
        this.synth.speak(this.utterance);
        this.isPlaying = true;
    }

    /**
     * Pause speech
     */
    pause() {
        if (this.isPlaying) {
            this.synth.pause();
            this.isPlaying = false;
        }
    }

    /**
     * Resume speech
     */
    resume() {
        if (!this.isPlaying && this.utterance) {
            this.synth.resume();
            this.isPlaying = true;
        }
    }

    /**
     * Toggle between play and pause
     */
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.resume();
        }
    }

    /**
     * Stop speech completely
     */
    stop() {
        this.synth.cancel();
        this.isPlaying = false;
        this.utterance = null;
        this.currentText = "";
        this.wordIndex = 0;
        this.words = [];
    }

    /**
     * Check if speech is currently playing
     * @returns {boolean} - True if speech is playing
     */
    isCurrentlyPlaying() {
        return this.isPlaying;
    }

    /**
     * Change the speech rate
     * @param {number} rate - New speech rate (0.5 to 2.0)
     */
    changeRate(rate) {
        if (this.utterance) {
            // Store current state
            const wasPlaying = this.isPlaying;
            const currentIndex = this.wordIndex;

            // Stop current speech
            this.stop();

            // Create new utterance with updated rate
            // We need to start from the current word
            const remainingText = this.words.slice(currentIndex).join(" ");
            this.speak(remainingText, {
                rate: rate,
                voiceName: this.utterance.voice
                    ? this.utterance.voice.name
                    : null,
                onWordChange: this.onWordChange,
                onEnd: this.onEnd,
            });

            // If it wasn't playing, pause it
            if (!wasPlaying) {
                this.pause();
            }
        }
    }
}
class ImageTextReader {
    constructor() {
        // Initialize properties
        this.images = [];
        this.selectedImages = [];
        this.extractedTexts = [];
        this.currentTextIndex = 0;
        this.isActive = false;
        this.ttsManager = new TTSManager();
        this.overlay = null;

        // Bind methods
        this.handleMessage = this.handleMessage.bind(this);
        this.scanImages = this.scanImages.bind(this);
        this.toggleImageSelection = this.toggleImageSelection.bind(this);
        this.readAllImages = this.readAllImages.bind(this);
        this.readSelectedImages = this.readSelectedImages.bind(this);
        this.createOverlay = this.createOverlay.bind(this);
        this.removeOverlay = this.removeOverlay.bind(this);
        this.updateOverlayText = this.updateOverlayText.bind(this);
        this.highlightWord = this.highlightWord.bind(this);

        // Set up message listener
        chrome.runtime.onMessage.addListener(this.handleMessage);
    }

    /**
     * Handle messages from popup and background
     * @param {Object} message - The message
     * @param {Object} sender - The message sender
     * @param {Function} sendResponse - Function to send response
     * @returns {boolean} - Whether the response will be sent asynchronously
     */
    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case "scanImages":
                this.scanImages().then((count) => {
                    sendResponse({ count });
                });
                return true; // Will respond asynchronously

            case "readAll":
                this.readAllImages();
                sendResponse({ success: true });
                return false;

            case "readSelected":
                this.readSelectedImages();
                sendResponse({ success: true });
                return false;

            case "stopReading":
                this.stopReading();
                sendResponse({ success: true });
                return false;

            default:
                sendResponse({ error: "Unknown action" });
                return false;
        }
    }

    /**
     * Scan the page for images that might contain text
     * @returns {Promise<number>} - Number of images found
     */
    async scanImages() {
        // Reset state
        this.images = [];
        this.selectedImages = [];

        // Get all images on the page
        const imgElements = document.querySelectorAll("img");

        // Filter images that are likely to contain text
        // Criteria: visible, reasonable size (not tiny icons)
        this.images = Array.from(imgElements).filter((img) => {
            // Check if image is visible
            const rect = img.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;

            // Check if image has reasonable size (at least 50x50 pixels)
            const hasReasonableSize = rect.width >= 50 && rect.height >= 50;

            return isVisible && hasReasonableSize;
        });

        // Add click handlers to images for selection
        this.images.forEach((img) => {
            // Remove any existing handlers
            img.removeEventListener("click", this.toggleImageSelection);

            // Add new handler
            img.addEventListener("click", this.toggleImageSelection);
        });

        // Return the number of images found
        return this.images.length;
    }

    /**
     * Toggle selection of an image
     * @param {Event} event - The click event
     */
    toggleImageSelection(event) {
        // Only handle clicks when extension is active
        if (!this.isActive) return;

        // Prevent the default click behavior
        event.preventDefault();
        event.stopPropagation();

        const img = event.target;

        // Check if image is already selected
        const index = this.selectedImages.indexOf(img);

        if (index === -1) {
            // Add to selected images
            this.selectedImages.push(img);

            // Add visual indicator (border)
            img.style.border = "3px solid #4285f4";
            img.style.boxSizing = "border-box";
        } else {
            // Remove from selected images
            this.selectedImages.splice(index, 1);

            // Remove visual indicator
            img.style.border = "";
        }
    }

    /**
     * Read text from all detected images
     */
    async readAllImages() {
        this.isActive = true;

        // Use all detected images
        await this.processImages(this.images);
    }

    /**
     * Read text from selected images
     */
    async readSelectedImages() {
        this.isActive = true;

        // Use only selected images
        if (this.selectedImages.length === 0) {
            alert("No images selected. Please click on images to select them.");
            return;
        }

        await this.processImages(this.selectedImages);
    }

    /**
     * Process images to extract and read text
     * @param {Array<HTMLImageElement>} imagesToProcess - Images to process
     */
    async processImages(imagesToProcess) {
        try {
            // Create overlay if it doesn't exist
            if (!this.overlay) {
                this.createOverlay();
            }

            // Update overlay to show loading state
            this.updateOverlayText("Processing images...");

            // Collect image data (URLs or base64)
            const imageDataArray = imagesToProcess.map((img) => {
                // For images with CORS issues, we might need to use canvas to get base64
                // But for simplicity, we'll use the src attribute for now
                return img.src;
            });

            // Send image data to background script for processing
            const response = await chrome.runtime.sendMessage({
                action: "extractText",
                imageDataArray,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Store extracted texts
            this.extractedTexts = response.texts.filter(
                (text) => text && text.trim() !== ""
            );

            if (this.extractedTexts.length === 0) {
                this.updateOverlayText("No text found in the images.");
                return;
            }

            // Start reading the first text
            this.currentTextIndex = 0;
            this.readCurrentText();
        } catch (error) {
            console.error("Error processing images:", error);
            this.updateOverlayText(`Error: ${error.message}`);
        }
    }

    /**
     * Read the current text using TTS
     */
    readCurrentText() {
        if (this.currentTextIndex >= this.extractedTexts.length) {
            // All texts have been read
            this.updateOverlayText("Finished reading all texts.");
            return;
        }

        const text = this.extractedTexts[this.currentTextIndex];
        this.updateOverlayText(text);

        // Get user preferences for TTS
        chrome.storage.sync.get(["defaultSpeed", "defaultVoice"], (result) => {
            const rate = result.defaultSpeed || 1.0;
            const voiceName = result.defaultVoice || "";

            // Start TTS
            this.ttsManager.speak(text, {
                rate,
                voiceName,
                onWordChange: this.highlightWord,
                onEnd: () => {
                    // Move to the next text when current one finishes
                    this.currentTextIndex++;

                    // Add a small delay before starting the next text
                    setTimeout(() => {
                        this.readCurrentText();
                    }, 1000);
                },
            });
        });

        // Save to history
        this.saveToHistory(text);
    }

    /**
     * Save the current reading to history
     * @param {string} text - The text being read
     */
    async saveToHistory(text) {
        const url = window.location.href;
        const timestamp = Date.now();

        await chrome.runtime.sendMessage({
            action: "addToHistory",
            entry: {
                url,
                timestamp,
                extractedText: text,
            },
        });
    }

    /**
     * Stop reading and clean up
     */
    stopReading() {
        this.ttsManager.stop();
        this.removeOverlay();
        this.isActive = false;

        // Remove selection indicators from images
        this.selectedImages.forEach((img) => {
            img.style.border = "";
        });

        this.selectedImages = [];
    }

    /**
     * Create the overlay UI
     */
    createOverlay() {
        // Create overlay container
        this.overlay = document.createElement("div");
        this.overlay.className = "image-text-reader-overlay";
        this.overlay.innerHTML = `
      <div class="overlay-content">
        <div class="text-display"></div>
        <div class="controls">
          <button class="play-pause-btn">Pause</button>
          <button class="stop-btn">Stop</button>
          <div class="speed-control">
            <label for="speed-select">Speed:</label>
            <select id="speed-select">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1" selected>1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
          <div class="voice-control">
            <label for="voice-select">Voice:</label>
            <select id="voice-select"></select>
          </div>
        </div>
      </div>
      <button class="close-btn">×</button>
    `;

        // Add to document
        document.body.appendChild(this.overlay);

        // Get elements
        const textDisplay = this.overlay.querySelector(".text-display");
        const playPauseBtn = this.overlay.querySelector(".play-pause-btn");
        const stopBtn = this.overlay.querySelector(".stop-btn");
        const speedSelect = this.overlay.querySelector("#speed-select");
        const voiceSelect = this.overlay.querySelector("#voice-select");
        const closeBtn = this.overlay.querySelector(".close-btn");

        // Set up event handlers
        playPauseBtn.addEventListener("click", () => {
            this.ttsManager.togglePlayPause();
            playPauseBtn.textContent = this.ttsManager.isCurrentlyPlaying()
                ? "Pause"
                : "Play";
        });

        stopBtn.addEventListener("click", () => {
            this.stopReading();
        });

        speedSelect.addEventListener("change", () => {
            const rate = parseFloat(speedSelect.value);
            this.ttsManager.changeRate(rate);

            // Save as default if user changes it
            chrome.storage.sync.set({ defaultSpeed: rate });
        });

        voiceSelect.addEventListener("change", () => {
            const voiceName = voiceSelect.value;

            // We need to restart TTS with the new voice
            const currentText = this.extractedTexts[this.currentTextIndex];
            const wasPlaying = this.ttsManager.isCurrentlyPlaying();

            this.ttsManager.stop();
            this.ttsManager.speak(currentText, {
                rate: parseFloat(speedSelect.value),
                voiceName,
                onWordChange: this.highlightWord,
                onEnd: () => {
                    this.currentTextIndex++;
                    setTimeout(() => {
                        this.readCurrentText();
                    }, 1000);
                },
            });

            if (!wasPlaying) {
                this.ttsManager.pause();
                playPauseBtn.textContent = "Play";
            }

            // Save as default
            chrome.storage.sync.set({ defaultVoice: voiceName });
        });

        closeBtn.addEventListener("click", () => {
            this.stopReading();
        });

        // Populate voice select
        this.ttsManager.getVoices().then((voices) => {
            // Clear existing options
            voiceSelect.innerHTML = "";

            // Add default option
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Default";
            voiceSelect.appendChild(defaultOption);

            // Add available voices
            voices.forEach((voice) => {
                const option = document.createElement("option");
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                voiceSelect.appendChild(option);
            });

            // Set selected voice from storage
            chrome.storage.sync.get("defaultVoice", (result) => {
                if (result.defaultVoice) {
                    voiceSelect.value = result.defaultVoice;
                }
            });
        });

        // Set selected speed from storage
        chrome.storage.sync.get("defaultSpeed", (result) => {
            if (result.defaultSpeed) {
                speedSelect.value = result.defaultSpeed.toString();
            }
        });
    }

    /**
     * Remove the overlay
     */
    removeOverlay() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
    }

    /**
     * Update the text displayed in the overlay
     * @param {string} text - The text to display
     */
    updateOverlayText(text) {
        if (this.overlay) {
            const textDisplay = this.overlay.querySelector(".text-display");
            textDisplay.textContent = text;
        }
    }

    /**
     * Highlight the current word being spoken
     * @param {string} word - The current word
     * @param {number} index - The index of the word
     */
    highlightWord(word, index) {
        if (!this.overlay) return;

        const textDisplay = this.overlay.querySelector(".text-display");
        const text = this.extractedTexts[this.currentTextIndex];

        // Split text into words
        const words = text.split(/\s+/);

        // Create HTML with highlighted word
        const html = words
            .map((w, i) => {
                if (i === index) {
                    return `<span class="highlighted-word">${w}</span>`;
                }
                return w;
            })
            .join(" ");

        textDisplay.innerHTML = html;
    }
}

// Initialize the content script
const imageTextReader = new ImageTextReader();
