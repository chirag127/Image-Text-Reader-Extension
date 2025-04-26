/**
 * Utility functions for text-to-speech
 */
class TTSManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.utterance = null;
    this.currentText = '';
    this.isPlaying = false;
    this.currentWord = '';
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
      const voice = voices.find(v => v.name === options.voiceName);
      if (voice) {
        this.utterance.voice = voice;
      }
    }

    // Set up event handlers
    this.utterance.onboundary = (event) => {
      if (event.name === 'word') {
        // Calculate which word is being spoken based on character index
        const upToIndex = this.currentText.substring(0, event.charIndex);
        this.wordIndex = upToIndex.split(/\s+/).length - 1;
        this.currentWord = this.words[this.wordIndex];
        
        // Call the onWordChange callback if provided
        if (this.onWordChange && typeof this.onWordChange === 'function') {
          this.onWordChange(this.currentWord, this.wordIndex);
        }
      }
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      
      // Call the onEnd callback if provided
      if (this.onEnd && typeof this.onEnd === 'function') {
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
    this.currentText = '';
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
      const remainingText = this.words.slice(currentIndex).join(' ');
      this.speak(remainingText, { 
        rate: rate,
        voiceName: this.utterance.voice ? this.utterance.voice.name : null,
        onWordChange: this.onWordChange,
        onEnd: this.onEnd
      });
      
      // If it wasn't playing, pause it
      if (!wasPlaying) {
        this.pause();
      }
    }
  }
}

export default TTSManager;
