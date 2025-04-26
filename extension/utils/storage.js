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
    const result = await chrome.storage.sync.get('apiKey');
    return result.apiKey || '';
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
    const result = await chrome.storage.sync.get('defaultSpeed');
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
    const result = await chrome.storage.sync.get('defaultVoice');
    return result.defaultVoice || '';
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
    const result = await chrome.storage.local.get('history');
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
    const result = await chrome.storage.local.get('history');
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
      apiKey: '',
      defaultSpeed: 1.0,
      defaultVoice: ''
    });
  }
}

export default StorageManager;
