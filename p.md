# Image Text Reader Extension - Product Requirements Document (PRD)

**Document Version:** 1.0
**Last Updated:** [current date]
**Owner:** Chirag Singhal
**Status:** Final
**Prepared for:** AI Code Assistant (augment code assistant)
**Prepared by:** Chirag Singhal (CTO Advisor)

---

**Instructions for AI Code Assistant:**

*   **Goal:** Build a production-ready browser extension as described in this document.
*   **Platform:** Google Chrome (Manifest V3). Ensure compatibility with Firefox where feasible with minimal changes.
*   **Technology:** Use HTML, CSS, and JavaScript for the extension frontend (popup, options page, content scripts, overlay).
*   **Project Structure:** Create an `extension/` folder containing all source code (`manifest.json`, JS files, HTML files, CSS files, icons).
*   **Code Quality:** Generate well-documented, modular, and maintainable code following best practices (e.g., clear variable names, functions, comments for complex logic). Use asynchronous patterns (async/await) for API calls and Chrome API interactions.
*   **Error Handling:** Implement robust error handling for API calls (Gemini), DOM manipulation, and Chrome API usage. Provide user-friendly feedback for errors.
*   **Performance:** Optimize for performance, especially image detection, batch API calls, and DOM manipulation to avoid slowing down the browser.
*   **User Experience:** Focus on a clean, intuitive, and seamless user experience. Follow the UI/UX guidelines specified.
*   **Completeness:** Implement all features described in this PRD. This is intended as a final product, not an MVP. Ensure all components (popup, options, content script, background service worker) work together cohesively.
*   **Testing:** While you won't perform browser testing, structure the code to be testable. Ensure the generated frontend code is logical and free from obvious syntax errors or flaws.
*   **Security:** Handle the user's Gemini API key securely. Store it using `chrome.storage.sync` or `chrome.storage.local` and only retrieve it when needed for API calls. Do not expose it unnecessarily.

---

**1. Introduction & Overview**

*   **1.1. Purpose:** To provide users with the ability to listen to text content embedded within images on webpages, enhancing web accessibility and providing a convenient way to consume visual information audibly.
*   **1.2. Problem Statement:** Text within images (infographics, diagrams, scanned documents, memes, product labels) is inaccessible to screen readers and cannot be easily copied or consumed audibly. This creates barriers for visually impaired users and inconveniences others.
*   **1.3. Vision / High-Level Solution:** A browser extension that seamlessly integrates with the user's browsing experience. Upon activation, it detects images containing text, uses the Gemini AI API to extract the text, and reads it aloud using the browser's text-to-speech (TTS) capabilities. The extension provides user controls for playback, voice/speed customization, image selection, and history tracking.

**2. Goals & Objectives**

*   **2.1. Business Goals:** (Assuming Freely Available Extension) - Increase web accessibility, establish user base, gather feedback for potential future premium features.
*   **2.2. Product Goals:**
    *   Accurately extract text from common image formats found on the web.
    *   Provide smooth and clear audio playback of extracted text.
    *   Offer intuitive user controls for managing the reading process.
    *   Allow users to customize the reading experience (speed, voice).
    *   Ensure reliable performance and efficient use of the Gemini API.
    *   Maintain user privacy and security regarding API keys.
*   **2.3. Success Metrics (KPIs):**
    *   Number of active weekly users.
    *   Average number of images processed per user session.
    *   Task completion rate (successfully reading text from a selected image).
    *   User ratings and reviews in the Chrome Web Store.
    *   API Error Rate (monitoring Gemini API call success).

**3. Scope**

*   **3.1. In Scope:**
    *   Browser Extension for Chrome (Manifest V3).
    *   Detecting images (e.g., `<img>` tags, potentially background images with text) on the current webpage.
    *   Sending image data (URLs or base64 encoded) to Gemini AI for text extraction (OCR).
    *   Using browser TTS engine (`speechSynthesis`) to read extracted text aloud.
    *   User activation via extension icon click.
    *   Functionality to read text from *all* detected images sequentially.
    *   Functionality for users to select *specific* images on the page for reading aloud (via clicking).
    *   Displaying the currently read text segment in a fixed overlay at the top of the screen.
    *   Highlighting the currently spoken phrase/sentence in the overlay.
    *   Playback controls (Play, Pause, Stop) accessible in the overlay.
    *   Controls for adjusting reading speed (e.g., 0.5x, 1x, 1.5x, 2x) in the overlay/options.
    *   Controls for selecting available TTS voices in the overlay/options.
    *   Batching image processing requests to the Gemini API.
    *   History feature: storing page URL, timestamp, and extracted text (accessible via Options page).
    *   Options page: API Key input, Speed/Voice defaults, History view, Reset Preferences button.
    *   Storing user preferences (API Key, Speed, Voice) using `chrome.storage.sync`.
    *   Storing history using `chrome.storage.local`.
    *   User feedback for loading states, processing, and errors.
    *   Minimalist and clean UI design.
*   **3.2. Out of Scope:**
    *   Support for browsers other than Chrome/Firefox initially.
    *   Reading text *not* inside images (e.g., standard paragraph text).
    *   Advanced OCR features (e.g., layout analysis, table extraction beyond simple text).
    *   Translation of extracted text.
    *   Offline functionality (requires Gemini API access).
    *   Saving extracted text to files (only viewing in history).
    *   User accounts or cloud synchronization beyond browser sync.
    *   Hosting a backend server for API key management.

**4. User Personas & Scenarios**

*   **4.1. Primary Persona(s):**
    *   **Alex (Visually Impaired User):** Relies on screen readers but struggles with image content. Wants a tool to read text in charts, diagrams, and scanned articles encountered online.
    *   **Ben (Student with Dyslexia):** Finds reading large amounts of text challenging. Wants to listen to text within lecture slide images or online textbook diagrams to aid comprehension.
    *   **Casey (Multitasker/Researcher):** Wants to quickly consume information from infographics or product images while doing other tasks. Prefers listening over reading in certain contexts.
*   **4.2. Key User Scenarios / Use Cases:**
    *   **Reading an Infographic:** User activates the extension on a page with an infographic, clicks "Read All", and listens to the text content sequentially.
    *   **Reading Specific Diagrams:** User activates the extension, clicks on two specific diagrams on the page, clicks "Read Selected", and listens to the text from only those diagrams.
    *   **Adjusting Speed:** User finds the default reading speed too fast, opens the overlay controls, and selects a slower speed.
    *   **Setting API Key:** First-time user opens the Options page, follows instructions to get a Gemini API key, pastes it into the input field, and saves.
    *   **Reviewing History:** User wants to recall text from an image read yesterday, opens the Options page, goes to History, and finds the relevant entry by URL/date.
    *   **Changing Voice:** User prefers a different voice, uses the voice selection dropdown in the overlay/options to choose an available system voice.

**5. User Stories**

*   **US1:** As a user, I want to click the extension icon so that I can activate the image text reading functionality on the current page.
*   **US2:** As a user, I want the extension to detect all relevant images containing text on the page so that I know what can be read.
*   **US3:** As a user, I want to click a "Read All" button so that the extension reads the text from all detected images sequentially.
*   **US4:** As a user, I want to be able to click on specific images on the page after activation so that I can select only those images for reading.
*   **US5:** As a user, I want a "Read Selected" button so that the extension reads text only from the images I have selected.
*   **US6:** As a user, I want to see the text currently being read aloud displayed in an overlay at the top of the screen so that I can follow along visually.
*   **US7:** As a user, I want playback controls (Play, Pause, Stop) available directly on the reading overlay so that I can easily manage the audio.
*   **US8:** As a user, I want to adjust the reading speed via the overlay or options page so that I can listen at my preferred pace.
*   **US9:** As a user, I want to select a preferred voice from the available system voices via the overlay or options page so that the reading sounds pleasant to me.
*   **US10:** As a user, I need to enter my Gemini API key in the Options page so that the extension can process images.
*   **US11:** As a user, I want my preferred speed and voice settings saved so that I don't have to set them every time.
*   **US12:** As a user, I want to view a history of pages and text I've previously read using the extension so that I can revisit the information.
*   **US13:** As a user, I want a button to reset all my settings (speed, voice, API key) to default so that I can start fresh if needed.
*   **US14:** As a user, I want clear feedback or error messages if the extension cannot process an image or encounters an API issue so that I understand what's happening.
*   **US15:** As a developer (instructed by AI), I want image processing requests to be batched to the Gemini API to improve efficiency and manage API usage.

**6. Functional Requirements (FR)**

*   **6.1. Core Functionality**
    *   **FR1.1: Activation:** The extension must be activated by clicking its icon in the browser toolbar.
    *   **FR1.2: Image Detection:** Upon activation, the extension must scan the DOM of the current tab to identify image elements (e.g., `<img>`, potentially CSS background images if feasible) that likely contain text.
    *   **FR1.3: Text Extraction (Gemini):** The extension must send image data (URL or base64) to the Gemini API via background service worker to perform OCR and receive extracted text. Use batching (e.g., 3-5 images per request).
    *   **FR1.4: Text-to-Speech (TTS):** The extension must use the `chrome.tts` or `window.speechSynthesis` API to read the extracted text aloud.
    *   **FR1.5: Read All:** Provide a mechanism (e.g., button in popup) to initiate reading text from all detected images sequentially.
    *   **FR1.6: Image Selection:** Allow users to click on page images after activation to toggle selection status (visual feedback needed, e.g., border).
    *   **FR1.7: Read Selected:** Provide a mechanism (e.g., button in popup/overlay) to read text only from user-selected images.
*   **6.2. User Interface (Overlay)**
    *   **FR2.1: Overlay Display:** Display a persistent but dismissible overlay banner at the top of the viewport when reading is active.
    *   **FR2.2: Current Text Display:** Show the text segment currently being spoken in the overlay.
    *   **FR2.3: Spoken Text Highlight:** Highlight the specific word or phrase being spoken within the overlay text display.
    *   **FR2.4: Play/Pause Control:** Include a Play/Pause toggle button in the overlay.
    *   **FR2.5: Stop Control:** Include a Stop button in the overlay (stops reading and dismisses overlay).
    *   **FR2.6: Speed Control:** Include controls (e.g., dropdown, buttons) in the overlay to adjust playback speed (e.g., 0.5x, 1x, 1.5x, 2x).
    *   **FR2.7: Voice Selection:** Include a dropdown in the overlay to select from available TTS voices.
*   **6.3. User Interface (Popup)**
    *   **FR3.1: Status Display:** Show the status after activation (e.g., "X images found", "Ready to read", "Reading image Y of Z").
    *   **FR3.2: Read All Button:** Include the "Read All" button.
    *   **FR3.3: Selection Instructions:** Provide brief instructions on how to select images if that mode is desired.
    *   **FR3.4: Link to Options:** Provide a link/button to open the Options page.
*   **6.4. Options Page**
    *   **FR4.1: API Key Input:** Provide a secure input field for the user's Gemini API key. Include instructions/link on how to obtain one.
    *   **FR4.2: Default Speed Setting:** Allow users to set their default reading speed.
    *   **FR4.3: Default Voice Setting:** Allow users to set their default TTS voice.
    *   **FR4.4: History View:** Display the reading history (URL, Timestamp, Extracted Text). Allow clearing history.
    *   **FR4.5: Reset Preferences:** Provide a button to reset API key, speed, voice, and clear history to defaults.
    *   **FR4.6: Save Preferences:** Settings (API Key, Speed, Voice) must be saved automatically or via a Save button.
*   **6.5. Data Management**
    *   **FR5.1: Preference Storage:** Store API Key, default speed, and default voice using `chrome.storage.sync`.
    *   **FR5.2: History Storage:** Store history entries (URL, Timestamp, Text) using `chrome.storage.local`. Manage storage limits if necessary (e.g., limit history size or duration).

**7. Non-Functional Requirements (NFR)**

*   **7.1. Performance**
    *   **NFR1.1: Responsiveness:** Extension activation and UI (popup, overlay) should be responsive (<500ms).
    *   **NFR1.2: Processing Time:** Image detection should be quick. Time-to-first-speech should be minimized after clicking "Read" (dependent on Gemini API speed, but batching and queuing should be efficient).
    *   **NFR1.3: Resource Usage:** Extension should consume minimal CPU/memory when idle. Resource usage during processing/reading should be reasonable.
*   **7.2. Scalability**
    *   **NFR2.1: Many Images:** Handle pages with a large number of images (e.g., 50+) gracefully without freezing the browser (use asynchronous processing, batching).
    *   **NFR2.2: API Limits:** Implement handling for potential Gemini API rate limits (e.g., exponential backoff on retries for specific errors, clear user messaging).
*   **7.3. Usability**
    *   **NFR3.1: Intuitiveness:** Controls and workflow (activate, select/read all, control playback) should be easy to understand and use.
    *   **NFR3.2: Feedback:** Provide clear visual feedback for states (activating, processing, reading, selected images, errors).
    *   **NFR3.3: Consistency:** Maintain a consistent UI style and behavior across the popup, overlay, and options page.
*   **7.4. Reliability / Availability**
    *   **NFR4.1: Stability:** Extension should not crash the browser tab or itself.
    *   **NFR4.2: Error Handling:** Gracefully handle errors (API errors, network issues, invalid images, TTS failures) and inform the user appropriately.
*   **7.5. Security**
    *   **NFR5.1: API Key Security:** User's Gemini API key must be stored securely (`chrome.storage`) and only used for sending requests to the official Gemini API endpoint over HTTPS. Avoid logging the key or embedding it in the code.
    *   **NFR5.2: Permissions:** Request only necessary permissions in `manifest.json`.
*   **7.6. Accessibility**
    *   **NFR6.1: Extension UI Accessibility:** The extension's own UI elements (popup, options page, overlay) should be accessible (e.g., keyboard navigable, screen reader compatible). Consider high contrast options.
*   **7.7. Maintainability**
    *   **NFR7.1: Code Quality:** Code should be well-structured, commented, and follow JS best practices for easy understanding and future modifications.

**8. UI/UX Requirements & Design**

*   **8.1. Wireframes / Mockups:** (Conceptual - based on discussion)
    *   **Popup:** Simple panel showing status ("X images found"), "Read All" button, brief text "Click images on page to select", link to Options.
    *   **Overlay:** Semi-transparent dark horizontal bar fixed at the top. Displays current text (white). Contains small icons/buttons for Play/Pause, Stop, Speed dropdown, Voice dropdown. Dismiss button ('X').
    *   **Options Page:** Standard extension options page layout. Clear sections: "API Key" (input field, instructions), "Reading Settings" (Speed slider/dropdown, Voice dropdown), "History" (scrollable list of entries with text), "Reset" button.
*   **8.2. Key UI Elements:** Use standard HTML controls styled minimally and cleanly. Icons for playback controls. Visual indication (e.g., colored border, overlay icon) on images that are selected.
*   **8.3. User Flow Diagrams:** (Conceptual)
    *   **Read All Flow:** Click Icon -> Popup shows status -> Click "Read All" -> Overlay appears -> Reading starts -> Use overlay controls -> Click Stop/Dismiss.
    *   **Select Flow:** Click Icon -> Popup shows status -> Click images on page -> Images get visual selection indicator -> Click "Read Selected" (in popup or overlay) -> Overlay appears -> Reading starts -> Use overlay controls -> Click Stop/Dismiss.
    *   **Settings Flow:** Click Icon -> Click Options link -> Options page opens -> Modify API key/Speed/Voice -> Settings saved -> View History -> Close Options page.

**9. Data Requirements**

*   **9.1. Data Model:**
    *   **Settings (`chrome.storage.sync`):**
        *   `apiKey`: String (User's Gemini API Key)
        *   `defaultSpeed`: Float (e.g., 1.0, 1.5)
        *   `defaultVoice`: String (Name/ID of the selected TTS voice)
    *   **History (`chrome.storage.local`):** Array of objects:
        *   `id`: String (Unique ID, e.g., timestamp)
        *   `url`: String (URL of the page)
        *   `timestamp`: Number (Timestamp of when reading occurred)
        *   `extractedText`: String (Concatenated text from images read in that session)
*   **9.2. Data Migration:** N/A for v1.0.
*   **9.3. Analytics & Tracking:** None required initially. Could be added later (opt-in) for usage statistics.

**10. Release Criteria**

*   **10.1. Functional Criteria:** All functional requirements listed in Section 6 are implemented and working correctly based on primary use cases.
*   **10.2. Non-Functional Criteria:** Meets performance, usability, security, and reliability requirements defined in Section 7. No critical bugs. Handles common errors gracefully.
*   **10.3. Testing Criteria:** Successfully tested on various websites with different image types and quantities. Tested core flows (Read All, Select, Settings, History). Cross-browser spot check (Chrome primary, Firefox secondary).
*   **10.4. Documentation Criteria:** Code includes comments for complex sections. `README.md` provides basic instructions for users (especially API key setup).

**11. Open Issues / Future Considerations**

*   **11.1. Open Issues:**
    *   Handling images loaded dynamically after initial page load (May require MutationObservers).
    *   Optimizing detection of *which* images actually contain meaningful text vs. decorative images (could involve heuristics or further AI analysis - likely out of scope for v1).
    *   Precise highlighting of text *within* the image as it's read (complex, likely requires coordinates from Gemini if available, out of scope for v1).
*   **11.2. Future Enhancements (Post-Launch):**
    *   Support for more languages (TTS and potentially OCR).
    *   Option to copy extracted text.
    *   Integration with other AI services (e.g., summarization, translation).
    *   More sophisticated image detection (e.g., background images, canvas elements).
    *   Finer-grained history (per-image text).
    *   Keyboard shortcuts for activation/playback.
    *   Improved accessibility features (e.g., high contrast modes for overlay).

**12. Appendix & Glossary**

*   **12.1. Glossary:**
    *   **CTO:** Chief Technology Officer
    *   **PRD:** Product Requirements Document
    *   **Gemini API:** Google's AI model API used here for OCR (Optical Character Recognition).
    *   **OCR:** Optical Character Recognition - extracting text from images.
    *   **TTS:** Text-to-Speech - synthesizing speech from text.
    *   **Manifest V3:** The current standard for Chrome Extension development.
    *   **Overlay:** A UI element displayed over the webpage content.
    *   **Popup:** The UI element shown when clicking the extension icon.
    *   **Options Page:** A dedicated page for extension settings.
    *   **Content Script:** Extension script injected into web pages to interact with DOM.
    *   **Background Service Worker:** Extension script running in the background for tasks like API calls.
    *   `chrome.storage.sync`: Chrome API for storing small amounts of data synced across devices.
    *   `chrome.storage.local`: Chrome API for storing larger amounts of data locally.
*   **12.2. Related Documents:** N/A

**13. Document History / Revisions**

*   **Version 1.0:** (Current Date) - Initial draft based on user requirements and CTO discussion.

stictly use the following gemini code example for text extraction:
// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node

import {
  GoogleGenAI,
} from '@google/genai';

async function main() {
  const ai = new GoogleGenAI({
  });
  // Ensure that the file is available in local system working directory or change the file path.
  const files = [
    await ai.files.upload({file: 'image (1).webp'}),
  ]
  const config = {
    responseMimeType: 'text/plain',
  };
  const model = 'gemini-2.5-flash-preview-04-17';
  const contents = [
    {
      role: 'user',
      parts: [
        {
          fileData: {
            fileUri: files[0].uri,
            mimeType: files[0].mimeType,
          }
        },
        {
          text: `INSERT_INPUT_HERE`,
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });
  for await (const chunk of response) {
    console.log(chunk.text);
  }
}

main();
