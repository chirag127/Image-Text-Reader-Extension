# Image Text Reader Extension

A browser extension that extracts and reads aloud text from images on webpages using Google's Gemini AI.

## Features

-   Detect images containing text on webpages
-   Extract text from images using Gemini AI
-   Read text aloud using browser's text-to-speech capabilities
-   Select specific images for reading
-   Adjust reading speed and voice
-   View history of extracted text

## Installation

### From Source

1. Clone this repository:

    ```
    git clone https://github.com/chirag127/Image-Text-Reader-Extension.git
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Generate icons:

    ```
    npm run generate-icons
    ```

4. Load the extension in Chrome:
    - Open Chrome and navigate to `chrome://extensions/`
    - Enable "Developer mode" in the top-right corner
    - Click "Load unpacked" and select the `extension` folder from this repository

### From Chrome Web Store

_(Coming soon)_

## Usage

1. Click the extension icon in your browser toolbar
2. The extension will scan for images on the current page
3. Click "Read All" to read text from all detected images, or
4. Click on specific images on the page to select them, then click "Read Selected"
5. Use the overlay controls to pause/resume, stop, adjust speed, or change voice

## Configuration

1. Click the extension icon, then click "Options"
2. Enter your Gemini API key (get one from [Google AI Studio](https://aistudio.google.com/app/apikey))
3. Set your preferred reading speed and voice
4. View and manage your reading history

## Development

### Project Structure

-   `extension/`: The extension source code
    -   `manifest.json`: Extension configuration
    -   `icons/`: Extension icons
    -   `popup/`: Popup UI files
    -   `content/`: Content scripts for image detection and overlay
    -   `background/`: Background service worker for API calls
    -   `options/`: Options page files
    -   `utils/`: Utility functions

### Building

To generate the extension icons:

```
npm run generate-icons
```

## License

MIT

## Credits

-   [Google Gemini AI](https://ai.google.dev/gemini-api) for text extraction
-   [Chrome Extension API](https://developer.chrome.com/docs/extensions/) for browser integration
