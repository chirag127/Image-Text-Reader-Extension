// background/background.js

/**
 * Background Service Worker for Image Text Reader Extension
 * Handles API calls and communication between components
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
 * Wrapper for Gemini API to extract text from images
 */
class GeminiAPI {
    /**
     * Initialize the API with the API key
     * @param {string} apiKey - The Gemini API key
     */
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        this.model = "gemini-2.5-flash-preview-04-17"; // Using the model specified in the PRD
    }

    /**
     * Extract text from a single image
     * @param {string} imageData - Base64 encoded image data or image URL
     * @returns {Promise<string>} - Extracted text
     */
    async extractTextFromImage(imageData) {
        try {
            // Check if API key is available
            if (!this.apiKey) {
                throw new Error("Gemini API key is not set");
            }

            // Determine if imageData is a URL or base64
            const isUrl = imageData.startsWith("http");
            let imageContent;

            if (isUrl) {
                // For URL, we need to fetch the image and convert to base64
                const response = await fetch(imageData);
                const blob = await response.blob();
                const base64 = await this._blobToBase64(blob);
                const mimeType = blob.type;

                imageContent = {
                    inline_data: {
                        mime_type: mimeType,
                        data: base64,
                    },
                };
            } else {
                // For base64, we already have the data
                // Assuming format: data:image/jpeg;base64,/9j/4AAQ...
                const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) {
                    throw new Error("Invalid base64 image data");
                }

                const mimeType = matches[1];
                const base64 = matches[2];

                imageContent = {
                    inline_data: {
                        mime_type: mimeType,
                        data: base64,
                    },
                };
            }

            // Prepare the request to Gemini API
            const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
            const requestData = {
                contents: [
                    {
                        parts: [
                            imageContent,
                            {
                                text: "Extract all text visible in this image. Return only the extracted text without any additional commentary.",
                            },
                        ],
                    },
                ],
            };

            // Make the API call
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    `Gemini API error: ${
                        errorData.error?.message || response.statusText
                    }`
                );
            }

            const data = await response.json();

            // Extract the text from the response
            if (
                data.candidates &&
                data.candidates.length > 0 &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts.length > 0
            ) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error(
                    "No text found in the image or unexpected API response format"
                );
            }
        } catch (error) {
            console.error("Error extracting text from image:", error);
            throw error;
        }
    }

    /**
     * Extract text from multiple images (batch processing)
     * @param {Array<string>} imageDataArray - Array of base64 encoded image data or image URLs
     * @returns {Promise<Array<string>>} - Array of extracted texts
     */
    async batchExtractText(imageDataArray) {
        try {
            // Process images in batches of 5
            const batchSize = 5;
            const results = [];

            for (let i = 0; i < imageDataArray.length; i += batchSize) {
                const batch = imageDataArray.slice(i, i + batchSize);
                const promises = batch.map((imageData) =>
                    this.extractTextFromImage(imageData)
                );

                // Wait for all promises in the current batch to resolve
                const batchResults = await Promise.all(promises);
                results.push(...batchResults);
            }

            return results;
        } catch (error) {
            console.error("Error in batch text extraction:", error);
            throw error;
        }
    }

    /**
     * Convert a Blob to base64
     * @param {Blob} blob - The blob to convert
     * @returns {Promise<string>} - Base64 string (without prefix)
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64 = reader.result.split(",")[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle different message actions
    switch (message.action) {
        case "extractText":
            handleExtractText(message.imageDataArray)
                .then((texts) => sendResponse({ texts }))
                .catch((error) => sendResponse({ error: error.message }));
            return true; // Will respond asynchronously

        case "addToHistory":
            handleAddToHistory(message.entry)
                .then(() => sendResponse({ success: true }))
                .catch((error) => sendResponse({ error: error.message }));
            return true; // Will respond asynchronously

        default:
            sendResponse({ error: "Unknown action" });
            return false;
    }
});

/**
 * Handle text extraction from images
 * @param {Array<string>} imageDataArray - Array of image data (URLs or base64)
 * @returns {Promise<Array<string>>} - Array of extracted texts
 */
async function handleExtractText(imageDataArray) {
    try {
        // Get API key from storage
        const apiKey = await StorageManager.getApiKey();

        if (!apiKey) {
            throw new Error(
                "Gemini API key is not set. Please set it in the options page."
            );
        }

        // Initialize Gemini API
        const geminiAPI = new GeminiAPI(apiKey);

        // Extract text from images (batch processing)
        const texts = await geminiAPI.batchExtractText(imageDataArray);

        return texts;
    } catch (error) {
        console.error("Error extracting text:", error);
        throw error;
    }
}

/**
 * Handle adding an entry to history
 * @param {Object} entry - The history entry
 * @returns {Promise<void>}
 */
async function handleAddToHistory(entry) {
    try {
        await StorageManager.addHistoryEntry(entry);
    } catch (error) {
        console.error("Error adding to history:", error);
        throw error;
    }
}

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        // Open options page on install to prompt for API key
        chrome.runtime.openOptionsPage();
    }
});
