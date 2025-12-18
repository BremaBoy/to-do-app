import { Platform } from 'react-native';

// Store your GROQ API key in environment variables in production
// Get a free key at: https://console.groq.com/keys
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

if (!GROQ_API_KEY) {
  console.warn('Missing EXPO_PUBLIC_GROQ_API_KEY environment variable. Voice features may not work.');
}

export const voiceService = {
  /**
   * Transcribe audio to text using Groq Whisper API
   * Uses standard fetch API with FormData
   * @param audioUri - Path to the recorded audio file
   * @returns Transcribed text
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      const formData = new FormData();
      
      // Ensure URI is properly formatted for platform
      const uri = Platform.OS === 'android' && !audioUri.startsWith('file://') 
        ? `file://${audioUri}` 
        : audioUri;

      console.log('Transcribing audio from URI:', uri);

      // Append file for React Native FormData
      // Note: 'type' and 'name' are required for RN file uploads
      // Changing type to 'audio/mp4' as it is often more reliably detected for .m4a files
      formData.append('file', {
        uri: uri,
        name: 'recording.m4a',
        type: 'audio/mp4',
      } as any);

      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'en');

      console.log('Sending audio to Groq (FormData created)...');

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          // Do NOT set Content-Type manually for FormData, fetch handles the boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  },

  /**
   * Split transcribed text into individual tasks
   * Handles natural language like "Buy groceries and call mom and schedule dentist"
   * @param transcribedText - The text from speech recognition
   * @returns Array of individual task titles
   */
  splitIntoTasks(transcribedText: string): string[] {
    if (!transcribedText || transcribedText.trim().length === 0) {
      return [];
    }

    // Split by common conjunctions and punctuation
    // Added 'plus' and 'also' to the splitting logic
    const tasks = transcribedText
        .split(/\s+(?:and|then|plus|also)\s+|\s*[,;]\s*/i)
      .map(task => task.trim())
      .filter(task => task.length > 0)
      .map(task => {
        // Remove common prefixes
        task = task.replace(/^(to |please |I need to |I have to |remember to |add )/i, '');
        
        // Capitalize first letter
        return task.charAt(0).toUpperCase() + task.slice(1);
      })
      .filter(task => task.length > 2); // Filter out very short tasks

    return tasks.length > 0 ? tasks : [transcribedText.trim()];
  },

  /**
   * Validate if the transcribed text is meaningful
   */
  isValidTranscription(text: string): boolean {
    if (!text || text.trim().length < 3) {
      return false;
    }
    
    // Check if it's not just noise or gibberish
    const wordCount = text.trim().split(/\s+/).length;
    return wordCount > 0 && text.length > 2;
  },
};