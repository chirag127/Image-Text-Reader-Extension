// popup/popup.js

/**
 * Popup script for Image Text Reader Extension
 */

/**
 * Utility functions for Chrome storage
 */
class StorageManager {
    /**
     * Get API key from sync storage
     * @returns {Promise<string>} - The API key or empty string if not set
     */
    static async getApiKey() {
        const result = await chrome.storage.sync.get("apiKey");
        return result.apiKey || "";
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    // Get DOM elements
    const statusContainer = document.getElementById("status-container");
    const statusMessage = document.getElementById("status-message");
    const statusLoader = document.getElementById("status-loader");
    const actionsContainer = document.getElementById("actions-container");
    const imageCount = document.getElementById("image-count");
    const readAllBtn = document.getElementById("read-all-btn");
    const readSelectedBtn = document.getElementById("read-selected-btn");
    const apiKeyMissing = document.getElementById("api-key-missing");
    const openOptionsBtn = document.getElementById("open-options-btn");
    const optionsBtn = document.getElementById("options-btn");

    // Check if API key is set
    const apiKey = await StorageManager.getApiKey();

    if (!apiKey) {
        // Show API key missing message
        statusContainer.classList.add("hidden");
        apiKeyMissing.classList.remove("hidden");
    } else {
        // Scan for images on the current page
        scanImages();
    }

    // Set up button event listeners
    readAllBtn.addEventListener("click", handleReadAll);
    readSelectedBtn.addEventListener("click", handleReadSelected);
    openOptionsBtn.addEventListener("click", openOptionsPage);
    optionsBtn.addEventListener("click", openOptionsPage);

    /**
     * Scan for images on the current page
     */
    async function scanImages() {
        try {
            // Get the active tab
            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const activeTab = tabs[0];

            // Send message to content script to scan for images
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: "scanImages",
            });

            // Hide loader and status message
            statusContainer.classList.add("hidden");

            if (response && response.count !== undefined) {
                // Show actions container
                actionsContainer.classList.remove("hidden");

                // Update image count
                const count = response.count;
                imageCount.textContent = `${count} image${
                    count !== 1 ? "s" : ""
                } found`;

                // Disable "Read All" button if no images found
                if (count === 0) {
                    readAllBtn.disabled = true;
                    readAllBtn.classList.add("disabled");
                }
            } else {
                // Content script not loaded or error occurred
                statusMessage.textContent =
                    "Error: Could not scan images. Please refresh the page and try again.";
                statusLoader.classList.add("hidden");
                statusContainer.classList.remove("hidden");
            }
        } catch (error) {
            console.error("Error scanning images:", error);
            statusMessage.textContent = "Error: " + error.message;
            statusLoader.classList.add("hidden");
            statusContainer.classList.remove("hidden");
        }
    }

    /**
     * Handle "Read All" button click
     */
    async function handleReadAll() {
        try {
            // Get the active tab
            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const activeTab = tabs[0];

            // Send message to content script to read all images
            await chrome.tabs.sendMessage(activeTab.id, { action: "readAll" });

            // Close the popup
            window.close();
        } catch (error) {
            console.error("Error reading all images:", error);
            statusMessage.textContent = "Error: " + error.message;
            statusLoader.classList.add("hidden");
            statusContainer.classList.remove("hidden");
            actionsContainer.classList.add("hidden");
        }
    }

    /**
     * Handle "Read Selected" button click
     */
    async function handleReadSelected() {
        try {
            // Get the active tab
            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            const activeTab = tabs[0];

            // Send message to content script to read selected images
            await chrome.tabs.sendMessage(activeTab.id, {
                action: "readSelected",
            });

            // Close the popup
            window.close();
        } catch (error) {
            console.error("Error reading selected images:", error);
            statusMessage.textContent = "Error: " + error.message;
            statusLoader.classList.add("hidden");
            statusContainer.classList.remove("hidden");
            actionsContainer.classList.add("hidden");
        }
    }

    /**
     * Open the options page
     */
    function openOptionsPage() {
        chrome.runtime.openOptionsPage();
        window.close();
    }
});
