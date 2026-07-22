import { Platform } from 'react-native';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

if (!GROQ_API_KEY) {
  console.warn(
    '[Groq] Missing EXPO_PUBLIC_GROQ_API_KEY environment variable.'
  );
}

export interface ParsedVoiceTask {
  title: string;
  dueDate?: number;
}

export const voiceService = {
  /**
   * Transcribe recorded audio using Groq Whisper.
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      if (!GROQ_API_KEY) {
        throw new Error(
          'Groq API key is missing. Check EXPO_PUBLIC_GROQ_API_KEY.'
        );
      }

      const formData = new FormData();

      const uri =
        Platform.OS === 'android' && !audioUri.startsWith('file://')
          ? `file://${audioUri}`
          : audioUri;

      console.log('[Groq] Transcribing audio:', uri);

      formData.append(
        'file',
        {
          uri,
          name: 'recording.m4a',
          type: 'audio/mp4',
        } as any
      );

      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'en');

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
          `Groq API Error: ${response.status} - ${errorBody}`
        );
      }

      const data = await response.json();

      const text = data?.text?.trim();

      if (!text) {
        throw new Error('No transcription returned from Groq.');
      }

      console.log('[Groq] Transcription:', text);

      return text;
    } catch (error) {
      console.error('[Groq] Transcription failed:', error);
      throw error;
    }
  },

  /**
   * Parse natural-language voice commands into tasks.
   *
   * Examples:
   *
   * "Call mom tomorrow"
   * =>
   * [{ title: "Call mom", dueDate: tomorrow }]
   *
   * "Buy groceries today and call John tomorrow"
   * =>
   * [
   *   { title: "Buy groceries", dueDate: today },
   *   { title: "Call John", dueDate: tomorrow }
   * ]
   *
   * "Schedule dentist for Friday"
   * =>
   * [{ title: "Schedule dentist", dueDate: Friday }]
   */
  parseVoiceTasks(transcribedText: string): ParsedVoiceTask[] {
    if (!transcribedText || !transcribedText.trim()) {
      return [];
    }

    let text = transcribedText
      .trim()
      .replace(/\s+/g, ' ');

    console.log('[Voice] Parsing:', text);

    /**
     * First split the sentence into potential tasks.
     *
     * We support:
     * - and
     * - then
     * - plus
     * - also
     * - commas
     * - semicolons
     *
     * Example:
     * "Buy groceries and call mom tomorrow"
     *
     * =>
     * "Buy groceries"
     * "call mom tomorrow"
     */
    const parts = text
      .split(
        /\s+(?:and then|then|and|plus|also)\s+|\s*[,;]\s*/i
      )
      .map(item => item.trim())
      .filter(Boolean);

    const tasks: ParsedVoiceTask[] = [];

    for (const part of parts) {
      const parsed = this.parseSingleTask(part);

      if (parsed && parsed.title.length > 2) {
        tasks.push(parsed);
      }
    }

    /**
     * If splitting did not work, treat the entire transcription
     * as one task.
     */
    if (tasks.length === 0) {
      const fallback = this.parseSingleTask(text);

      if (fallback && fallback.title.length > 2) {
        return [fallback];
      }
    }

    console.log('[Voice] Parsed tasks:', tasks);

    return tasks;
  },

  /**
   * Parse one individual task.
   */
  parseSingleTask(text: string): ParsedVoiceTask | null {
    if (!text || !text.trim()) {
      return null;
    }

    let title = text.trim();
    let dueDate: number | undefined;

    const lowerText = title.toLowerCase();

    /**
     * Remove common voice-command prefixes.
     */
    title = title.replace(
      /^(please\s+|i need to\s+|i have to\s+|remember to\s+|add\s+|create\s+|make sure to\s+)/i,
      ''
    );

    /**
     * TODAY
     *
     * Examples:
     * "Call mom today"
     * "Buy groceries for today"
     */
    if (
      /\b(today|for today|due today)\b/i.test(title)
    ) {
      dueDate = this.getDateAtDayOffset(0);

      title = title.replace(
        /\s*(for\s+)?(today|due today)\b/gi,
        ''
      );
    }

    /**
     * TOMORROW / TMR / TMRW
     *
     * Examples:
     * "Call mom tomorrow"
     * "Call mom tmr"
     * "Call mom tmrw"
     */
    if (
      /\b(tomorrow|tmr|tmrw|for tomorrow|due tomorrow)\b/i.test(
        title
      )
    ) {
      dueDate = this.getDateAtDayOffset(1);

      title = title.replace(
        /\s*(for\s+)?(tomorrow|tmr|tmrw|due tomorrow)\b/gi,
        ''
      );
    }

    /**
     * NEXT WEEK
     */
    if (/\b(next week)\b/i.test(title)) {
      dueDate = this.getDateAtDayOffset(7);

      title = title.replace(
        /\s*(for\s+)?next week\b/gi,
        ''
      );
    }

    /**
     * DAYS OF THE WEEK
     *
     * Examples:
     * "Call John Monday"
     * "Call John on Monday"
     * "Schedule dentist for Friday"
     */
    const dayMatch = title.match(
      /\b(?:on|for)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    );

    if (dayMatch) {
      const dayName = dayMatch[1];

      dueDate = this.getNextDayOfWeek(dayName);

      title = title.replace(
        new RegExp(
          `\\s*(?:on|for)?\\s*${dayName}\\b`,
          'i'
        ),
        ''
      );
    }

    /**
     * Handle "in X days"
     *
     * Example:
     * "Call mom in 3 days"
     */
    const inDaysMatch = title.match(
      /\bin\s+(\d+)\s+days?\b/i
    );

    if (inDaysMatch) {
      const numberOfDays = parseInt(inDaysMatch[1], 10);

      if (!isNaN(numberOfDays)) {
        dueDate = this.getDateAtDayOffset(numberOfDays);

        title = title.replace(
          /\bin\s+\d+\s+days?\b/i,
          ''
        );
      }
    }

    /**
     * Clean up title.
     */
    title = title
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.!?])/g, '$1')
      .trim();

    /**
     * Remove trailing "for" or "on"
     * left after removing a date.
     *
     * Example:
     * "Call mom for tomorrow"
     *
     * becomes:
     * "Call mom for"
     *
     * We clean it to:
     * "Call mom"
     */
    title = title.replace(
      /\s+(for|on|at)$/i,
      ''
    );

    /**
     * Capitalize first letter.
     */
    if (title.length > 0) {
      title =
        title.charAt(0).toUpperCase() +
        title.slice(1);
    }

    if (title.length < 3) {
      return null;
    }

    return {
      title,
      dueDate,
    };
  },

  /**
   * Get a date N days from today.
   */
  getDateAtDayOffset(days: number): number {
    const date = new Date();

    date.setHours(23, 59, 59, 999);

    date.setDate(date.getDate() + days);

    return date.getTime();
  },

  /**
   * Get the next occurrence of a weekday.
   *
   * If today is Monday and user says "Monday",
   * it returns next Monday rather than today.
   */
  getNextDayOfWeek(dayName: string): number {
    const daysOfWeek: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDay =
      daysOfWeek[dayName.toLowerCase()];

    if (targetDay === undefined) {
      return this.getDateAtDayOffset(0);
    }

    const today = new Date();
    const currentDay = today.getDay();

    let daysUntilTarget =
      targetDay - currentDay;

    /**
     * If the target day is today,
     * schedule it for next week.
     */
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }

    return this.getDateAtDayOffset(daysUntilTarget);
  },

  /**
   * Validate transcription.
   */
  isValidTranscription(text: string): boolean {
    if (!text || text.trim().length < 3) {
      return false;
    }

    const cleaned = text.trim();

    /**
     * Ignore obvious empty/noise responses.
     */
    const invalidResponses = [
      '...',
      'uh',
      'um',
      'hmm',
      'noise',
      'silence',
    ];

    if (
      invalidResponses.includes(
        cleaned.toLowerCase()
      )
    ) {
      return false;
    }

    return true;
  },
};