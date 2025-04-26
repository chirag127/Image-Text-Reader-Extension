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
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-2.5-flash-preview-04-17'; // Using the model specified in the PRD
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
        throw new Error('Gemini API key is not set');
      }

      // Determine if imageData is a URL or base64
      const isUrl = imageData.startsWith('http');
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
            data: base64
          }
        };
      } else {
        // For base64, we already have the data
        // Assuming format: data:image/jpeg;base64,/9j/4AAQ...
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid base64 image data');
        }
        
        const mimeType = matches[1];
        const base64 = matches[2];
        
        imageContent = {
          inline_data: {
            mime_type: mimeType,
            data: base64
          }
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
                text: "Extract all text visible in this image. Return only the extracted text without any additional commentary."
              }
            ]
          }
        ]
      };

      // Make the API call
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Extract the text from the response
      if (data.candidates && data.candidates.length > 0 && 
          data.candidates[0].content && data.candidates[0].content.parts && 
          data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No text found in the image or unexpected API response format');
      }
    } catch (error) {
      console.error('Error extracting text from image:', error);
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
        const promises = batch.map(imageData => this.extractTextFromImage(imageData));
        
        // Wait for all promises in the current batch to resolve
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      console.error('Error in batch text extraction:', error);
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
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export default GeminiAPI;
