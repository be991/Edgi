export class LanguageDetector {
  private static readonly COMMON_ENGLISH_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
    'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
    'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
    'which', 'go', 'me', 'apply', 'eligibility', 'deadline', 'fellowship',
    'internship', 'requirements', 'program', 'programme', 'grant', 'bounty'
  ]);

  public static detect(text: string): { language: string; isEnglish: boolean; confidence: number } {
    if (!text || text.trim().length === 0) {
      return { language: 'unknown', isEnglish: true, confidence: 0 };
    }

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    if (words.length === 0) {
      return { language: 'en', isEnglish: true, confidence: 0.5 };
    }

    let englishMatches = 0;
    const sampleSize = Math.min(words.length, 100);

    for (let i = 0; i < sampleSize; i++) {
      const word = words[i];
      if (word && this.COMMON_ENGLISH_WORDS.has(word)) {
        englishMatches++;
      }
    }

    const ratio = englishMatches / sampleSize;
    const isEnglish = ratio >= 0.15; // At least 15% common English stopwords

    return {
      language: isEnglish ? 'en' : 'other',
      isEnglish,
      confidence: Math.min(ratio * 2, 1.0),
    };
  }
}
