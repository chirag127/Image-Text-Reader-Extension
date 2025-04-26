// options/options.js

/**
 * Options page script for Image Text Reader Extension
 */

/**
 * Utility functions for Chrome storage
 */
class StorageManager {
    /**
     * Save API key to sync storage
     * @param {string} apiKey - The Gemini API key
     * @returns {Promise<void>}
     */
    static async saveApiKey(apiKey) {
        return chrome.storage.sync.set({ apiKey });
    }

    /**
     * Get API key from sync storage
     * @returns {Promise<string>} - The API key or empty string if not set
     */
    static async getApiKey() {
        const result = await chrome.storage.sync.get("apiKey");
        return result.apiKey || "";
    }

    /**
     * Save default speed setting
     * @param {number} speed - The speech rate (0.5 to 2.0)
     * @returns {Promise<void>}
     */
    static async saveDefaultSpeed(speed) {
        return chrome.storage.sync.set({ defaultSpeed: speed });
    }

    /**
     * Get default speed setting
     * @returns {Promise<number>} - The default speed (1.0 if not set)
     */
    static async getDefaultSpeed() {
        const result = await chrome.storage.sync.get("defaultSpeed");
        return result.defaultSpeed || 1.0;
    }

    /**
     * Save default voice setting
     * @param {string} voice - The voice name/ID
     * @returns {Promise<void>}
     */
    static async saveDefaultVoice(voice) {
        return chrome.storage.sync.set({ defaultVoice: voice });
    }

    /**
     * Get default voice setting
     * @returns {Promise<string>} - The default voice or empty string if not set
     */
    static async getDefaultVoice() {
        const result = await chrome.storage.sync.get("defaultVoice");
        return result.defaultVoice || "";
    }

    /**
     * Add an entry to the reading history
     * @param {Object} entry - The history entry
     * @param {string} entry.url - The URL of the page
     * @param {number} entry.timestamp - Timestamp of when reading occurred
     * @param {string} entry.extractedText - Concatenated text from images read
     * @returns {Promise<void>}
     */
    static async addHistoryEntry(entry) {
        // Generate a unique ID for the entry
        const id = Date.now().toString();
        const newEntry = { id, ...entry };

        // Get existing history
        const result = await chrome.storage.local.get("history");
        const history = result.history || [];

        // Add new entry to the beginning of the array
        history.unshift(newEntry);

        // Limit history size to 100 entries
        const limitedHistory = history.slice(0, 100);

        // Save updated history
        return chrome.storage.local.set({ history: limitedHistory });
    }

    /**
     * Get all history entries
     * @returns {Promise<Array>} - Array of history entries
     */
    static async getHistory() {
        const result = await chrome.storage.local.get("history");
        return result.history || [];
    }

    /**
     * Clear all history entries
     * @returns {Promise<void>}
     */
    static async clearHistory() {
        return chrome.storage.local.set({ history: [] });
    }

    /**
     * Reset all preferences to defaults
     * @returns {Promise<void>}
     */
    static async resetAllPreferences() {
        return chrome.storage.sync.set({
            apiKey: "",
            defaultSpeed: 1.0,
            defaultVoice: "",
        });
    }
}

/**
 * Utility functions for text-to-speech
 */
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
document.addEventListener("DOMContentLoaded", async () => {
    // Initialize TTS manager for voice testing
    const ttsManager = new TTSManager();

    // Get DOM elements
    const apiKeyInput = document.getElementById("api-key-input");
    const toggleApiKeyBtn = document.getElementById("toggle-api-key");
    const saveApiKeyBtn = document.getElementById("save-api-key");
    const apiKeyStatus = document.getElementById("api-key-status");

    const defaultSpeedSelect = document.getElementById("default-speed");
    const defaultVoiceSelect = document.getElementById("default-voice");
    const saveReadingSettingsBtn = document.getElementById(
        "save-reading-settings"
    );
    const testVoiceBtn = document.getElementById("test-voice");
    const readingSettingsStatus = document.getElementById(
        "reading-settings-status"
    );

    const historyList = document.getElementById("history-list");
    const clearHistoryBtn = document.getElementById("clear-history");

    const resetAllBtn = document.getElementById("reset-all");
    const resetStatus = document.getElementById("reset-status");

    // Load saved settings
    await loadSettings();

    // Load history
    await loadHistory();

    // Populate voice select with available voices
    await populateVoiceSelect();

    // Set up event listeners
    toggleApiKeyBtn.addEventListener("click", toggleApiKeyVisibility);
    saveApiKeyBtn.addEventListener("click", saveApiKey);
    saveReadingSettingsBtn.addEventListener("click", saveReadingSettings);
    testVoiceBtn.addEventListener("click", testVoice);
    clearHistoryBtn.addEventListener("click", clearHistory);
    resetAllBtn.addEventListener("click", resetAllPreferences);

    /**
     * Load saved settings from storage
     */
    async function loadSettings() {
        try {
            // Load API key
            const apiKey = await StorageManager.getApiKey();
            apiKeyInput.value = apiKey;

            // Load default speed
            const defaultSpeed = await StorageManager.getDefaultSpeed();
            defaultSpeedSelect.value = defaultSpeed.toString();

            // Load default voice
            const defaultVoice = await StorageManager.getDefaultVoice();
            // We'll set this after populating the voice select
        } catch (error) {
            console.error("Error loading settings:", error);
            showStatus(
                apiKeyStatus,
                "Error loading settings: " + error.message,
                "error"
            );
        }
    }

    /**
     * Populate voice select with available voices
     */
    async function populateVoiceSelect() {
        try {
            const voices = await ttsManager.getVoices();

            // Clear existing options (except the default)
            while (defaultVoiceSelect.options.length > 1) {
                defaultVoiceSelect.remove(1);
            }

            // Add available voices
            voices.forEach((voice) => {
                const option = document.createElement("option");
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                defaultVoiceSelect.appendChild(option);
            });

            // Set selected voice from storage
            const defaultVoice = await StorageManager.getDefaultVoice();
            if (defaultVoice) {
                defaultVoiceSelect.value = defaultVoice;
            }
        } catch (error) {
            console.error("Error populating voices:", error);
        }
    }

    /**
     * Toggle API key visibility
     */
    function toggleApiKeyVisibility() {
        if (apiKeyInput.type === "password") {
            apiKeyInput.type = "text";
            toggleApiKeyBtn.textContent = "🔒";
            toggleApiKeyBtn.title = "Hide API Key";
        } else {
            apiKeyInput.type = "password";
            toggleApiKeyBtn.textContent = "👁️";
            toggleApiKeyBtn.title = "Show API Key";
        }
    }

    /**
     * Save API key to storage
     */
    async function saveApiKey() {
        try {
            const apiKey = apiKeyInput.value.trim();

            if (!apiKey) {
                showStatus(apiKeyStatus, "Please enter an API key", "error");
                return;
            }

            await StorageManager.saveApiKey(apiKey);
            showStatus(apiKeyStatus, "API key saved successfully", "success");
        } catch (error) {
            console.error("Error saving API key:", error);
            showStatus(
                apiKeyStatus,
                "Error saving API key: " + error.message,
                "error"
            );
        }
    }

    /**
     * Save reading settings to storage
     */
    async function saveReadingSettings() {
        try {
            const speed = parseFloat(defaultSpeedSelect.value);
            const voice = defaultVoiceSelect.value;

            await StorageManager.saveDefaultSpeed(speed);
            await StorageManager.saveDefaultVoice(voice);

            showStatus(
                readingSettingsStatus,
                "Reading settings saved successfully",
                "success"
            );
        } catch (error) {
            console.error("Error saving reading settings:", error);
            showStatus(
                readingSettingsStatus,
                "Error saving settings: " + error.message,
                "error"
            );
        }
    }

    /**
     * Test the selected voice
     */
    function testVoice() {
        try {
            const speed = parseFloat(defaultSpeedSelect.value);
            const voiceName = defaultVoiceSelect.value;

            // Sample text for testing
            const testText =
                "This is a test of the Image Text Reader voice settings.";

            // Speak the test text
            ttsManager.speak(testText, {
                rate: speed,
                voiceName: voiceName,
            });
        } catch (error) {
            console.error("Error testing voice:", error);
            showStatus(
                readingSettingsStatus,
                "Error testing voice: " + error.message,
                "error"
            );
        }
    }

    /**
     * Load history from storage
     */
    async function loadHistory() {
        try {
            const history = await StorageManager.getHistory();

            // Clear existing history items
            historyList.innerHTML = "";

            if (history.length === 0) {
                // Show empty message
                historyList.innerHTML =
                    '<div class="empty-history">No history entries yet.</div>';
                return;
            }

            // Add history items
            history.forEach((entry) => {
                const historyItem = document.createElement("div");
                historyItem.className = "history-item";

                const date = new Date(entry.timestamp);
                const formattedDate = date.toLocaleString();

                historyItem.innerHTML = `
          <div class="history-item-header">
            <a href="${
                entry.url
            }" class="history-item-url" target="_blank" title="${
                    entry.url
                }">${truncateUrl(entry.url, 50)}</a>
            <span class="history-item-date">${formattedDate}</span>
          </div>
          <div class="history-item-text">${entry.extractedText}</div>
        `;

                historyList.appendChild(historyItem);
            });
        } catch (error) {
            console.error("Error loading history:", error);
            historyList.innerHTML =
                '<div class="empty-history">Error loading history.</div>';
        }
    }

    /**
     * Clear all history
     */
    async function clearHistory() {
        if (confirm("Are you sure you want to clear all history?")) {
            try {
                await StorageManager.clearHistory();
                loadHistory(); // Reload history (will show empty message)
            } catch (error) {
                console.error("Error clearing history:", error);
            }
        }
    }

    /**
     * Reset all preferences to defaults
     */
    async function resetAllPreferences() {
        if (
            confirm(
                "Are you sure you want to reset all preferences? This will clear your API key, settings, and history."
            )
        ) {
            try {
                await StorageManager.resetAllPreferences();
                await StorageManager.clearHistory();

                // Reload settings and history
                await loadSettings();
                await loadHistory();

                showStatus(
                    resetStatus,
                    "All preferences have been reset to defaults",
                    "success"
                );
            } catch (error) {
                console.error("Error resetting preferences:", error);
                showStatus(
                    resetStatus,
                    "Error resetting preferences: " + error.message,
                    "error"
                );
            }
        }
    }

    /**
     * Show a status message
     * @param {HTMLElement} element - The status element
     * @param {string} message - The message to show
     * @param {string} type - The type of message ('success' or 'error')
     */
    function showStatus(element, message, type) {
        element.textContent = message;
        element.className = "status-message " + type;

        // Clear the status after 5 seconds
        setTimeout(() => {
            element.className = "status-message";
        }, 5000);
    }

    /**
     * Truncate a URL to a specified length
     * @param {string} url - The URL to truncate
     * @param {number} maxLength - The maximum length
     * @returns {string} - The truncated URL
     */
    function truncateUrl(url, maxLength) {
        if (url.length <= maxLength) {
            return url;
        }

        // Remove protocol
        let displayUrl = url.replace(/^https?:\/\//, "");

        if (displayUrl.length <= maxLength) {
            return displayUrl;
        }

        // Truncate in the middle
        const start = Math.floor((maxLength - 3) / 2);
        const end = Math.ceil((maxLength - 3) / 2);

        return (
            displayUrl.substring(0, start) +
            "..." +
            displayUrl.substring(displayUrl.length - end)
        );
    }
});
