/**
 * Post Formatter Utilities
 * Utilities for formatting marketplace posts with emojis, text formatting, and validation
 */

/**
 * Character and word count limits for different post elements
 */
export const CHARACTER_LIMITS = {
  title: { min: 50, max: 80 }, // Character limits for titles
  description: { min: 200, max: 500 }, // Word limits for descriptions
  shortDescription: { min: 50, max: 150 }, // Word limits for short descriptions
};

/**
 * Emoji categories for different product types and contexts
 */
export const EMOJI_CATEGORIES = {
  // General
  attention: ['✨', '⭐', '💫', '🌟', '🎯'],
  quality: ['👌', '💎', '🏆', '✅', '⚡'],
  deal: ['💰', '💵', '🤑', '💸', '🔥'],
  new: ['🆕', '✨', '🎁', '📦', '🌟'],

  // Product categories
  electronics: ['📱', '💻', '🖥️', '⌚', '🎧', '📷', '🔌', '⚡'],
  clothing: ['👕', '👗', '👔', '👖', '👠', '👟', '🧥', '👜'],
  furniture: ['🛋️', '🪑', '🛏️', '🚪', '🪟', '🏠'],
  sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏋️', '🚴', '⛳'],
  toys: ['🧸', '🎮', '🎯', '🎲', '🧩', '🎨', '🎪'],
  books: ['📚', '📖', '📝', '✏️', '🔖'],
  automotive: ['🚗', '🚙', '🏎️', '🔧', '⚙️', '🛞'],
  home: ['🏡', '🏠', '🛋️', '🍽️', '🧹', '🔨'],
  beauty: ['💄', '💅', '💇', '🧴', '✨'],
  jewelry: ['💍', '💎', '⌚', '👑', '✨'],

  // Condition indicators
  excellent: ['✨', '💯', '⭐', '🌟', '👌'],
  good: ['✅', '👍', '😊'],
  fair: ['📦', '🔧'],

  // Actions/CTA
  buy: ['🛒', '💳', '🛍️', '💰'],
  contact: ['📞', '📧', '💬', '📱'],
  shipping: ['📦', '🚚', '✈️', '🌍'],
  local: ['📍', '🗺️', '🏠'],
};

/**
 * Format validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate title length and format
 */
export function validateTitle(title: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const length = title.length;
  if (length < CHARACTER_LIMITS.title.min) {
    errors.push(
      `Title too short: ${length} characters (minimum ${CHARACTER_LIMITS.title.min})`
    );
  }
  if (length > CHARACTER_LIMITS.title.max) {
    errors.push(
      `Title too long: ${length} characters (maximum ${CHARACTER_LIMITS.title.max})`
    );
  }

  // Check for excessive capitalization
  const upperCaseCount = (title.match(/[A-Z]/g) || []).length;
  const totalLetters = (title.match(/[a-zA-Z]/g) || []).length;
  if (totalLetters > 0 && upperCaseCount / totalLetters > 0.5) {
    warnings.push('Excessive capitalization detected');
  }

  // Check for excessive punctuation
  if (title.match(/[!?]{2,}/)) {
    warnings.push('Excessive punctuation detected (!!!, ???)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate description word count and format
 */
export function validateDescription(
  description: string,
  minWords: number = 200,
  maxWords: number = 500
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const wordCount = countWords(description);

  if (wordCount < minWords) {
    errors.push(
      `Description too short: ${wordCount} words (minimum ${minWords})`
    );
  }
  if (wordCount > maxWords) {
    errors.push(
      `Description too long: ${wordCount} words (maximum ${maxWords})`
    );
  }

  // Check emoji count
  const emojiCount = countEmojis(description);
  if (emojiCount > 10) {
    warnings.push(`Too many emojis: ${emojiCount} (recommended: 2-4)`);
  }

  // Check for readability
  if (!description.includes('\n') && wordCount > 100) {
    warnings.push('Consider adding paragraph breaks for readability');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Count emojis in text
 * Note: This uses a basic emoji regex that covers common emojis.
 * For more comprehensive emoji detection, consider using a library like 'emoji-regex'
 */
export function countEmojis(text: string): number {
  // Basic emoji regex covering common Unicode ranges
  // This includes: emoticons, misc symbols, dingbats, transport, and flags
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{231A}-\u{231B}\u{23E9}-\u{23EC}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{2934}-\u{2935}]/gu;
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
}

/**
 * Insert emojis into text at appropriate positions
 */
export function insertEmojis(
  text: string,
  emojis: string[],
  strategy: 'start' | 'end' | 'distributed' = 'distributed'
): string {
  if (emojis.length === 0) return text;

  switch (strategy) {
    case 'start':
      return `${emojis.join(' ')} ${text}`;

    case 'end':
      return `${text} ${emojis.join(' ')}`;

    case 'distributed': {
      // Split text into sentences
      const sentences = text.split(/([.!?]+\s+)/);
      const emojiInterval = Math.floor(sentences.length / emojis.length);

      let result = '';
      let emojiIndex = 0;

      sentences.forEach((sentence, index) => {
        result += sentence;
        if (
          emojiIndex < emojis.length &&
          index > 0 &&
          index % emojiInterval === 0
        ) {
          result += ` ${emojis[emojiIndex]}`;
          emojiIndex++;
        }
      });

      return result.trim();
    }
  }
}

/**
 * Suggest emojis based on product category and context
 */
export function suggestEmojis(
  productCategory: string,
  condition?: string,
  count: number = 3
): string[] {
  const suggested: string[] = [];
  const categoryLower = productCategory.toLowerCase();

  // Add category-specific emojis
  for (const [category, emojis] of Object.entries(EMOJI_CATEGORIES)) {
    if (categoryLower.includes(category)) {
      suggested.push(...emojis.slice(0, 2));
    }
  }

  // Add condition-based emojis
  if (condition) {
    const conditionLower = condition.toLowerCase();
    if (
      conditionLower.includes('new') ||
      conditionLower.includes('excellent')
    ) {
      suggested.push(...EMOJI_CATEGORIES.excellent.slice(0, 1));
    } else if (conditionLower.includes('good')) {
      suggested.push(...EMOJI_CATEGORIES.good.slice(0, 1));
    }
  }

  // Add general attention emoji if we need more
  if (suggested.length < count) {
    suggested.push(
      ...EMOJI_CATEGORIES.attention.slice(0, count - suggested.length)
    );
  }

  // Remove duplicates and limit to requested count
  return [...new Set(suggested)].slice(0, count);
}

/**
 * Format text with bullet points
 */
export function formatBulletPoints(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

/**
 * Format text with numbered list
 */
export function formatNumberedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

/**
 * Add spacing and paragraphs for readability
 */
export function formatParagraphs(text: string): string {
  // Split by existing line breaks and filter empty lines
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Join with double line breaks
  return paragraphs.join('\n\n');
}

/**
 * Capitalize first letter of each sentence
 */
export function capitalizeFirstLetter(text: string): string {
  return text.replace(/(^\w|[.!?]\s+\w)/g, (match) => match.toUpperCase());
}

/**
 * Remove excessive punctuation
 */
export function normalizeExclamation(text: string): string {
  return text.replace(/!{2,}/g, '!').replace(/\?{2,}/g, '?');
}

/**
 * Truncate text to word limit while preserving sentences
 */
export function truncateToWordLimit(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  // Truncate to max words
  let truncated = words.slice(0, maxWords).join(' ');

  // Try to end at a sentence boundary
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

  if (lastSentenceEnd > truncated.length * 0.8) {
    // If we're close to the end, use the sentence boundary
    truncated = truncated.substring(0, lastSentenceEnd + 1);
  } else {
    // Otherwise just add ellipsis
    truncated += '...';
  }

  return truncated;
}

/**
 * Clean and format marketplace post text
 */
export function cleanText(text: string): string {
  let cleaned = text;

  // Remove extra whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Normalize line breaks (max 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Normalize punctuation
  cleaned = normalizeExclamation(cleaned);

  // Capitalize sentences
  cleaned = capitalizeFirstLetter(cleaned);

  return cleaned.trim();
}

/**
 * Format price display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(price);
}

/**
 * Add call-to-action footer
 */
export function addCallToAction(
  description: string,
  cta: string = 'Message me for more details!'
): string {
  return `${description}\n\n${cta}`;
}

/**
 * Format complete marketplace post
 */
export interface FormattedPost {
  title: string;
  description: string;
  validation: {
    title: ValidationResult;
    description: ValidationResult;
  };
  metadata: {
    wordCount: number;
    characterCount: number;
    emojiCount: number;
  };
}

/**
 * Format and validate complete post
 */
export function formatMarketplacePost(
  title: string,
  description: string,
  options: {
    cleanText?: boolean;
    addEmojis?: boolean;
    emojis?: string[];
    emojiStrategy?: 'start' | 'end' | 'distributed';
    addCTA?: boolean;
    cta?: string;
  } = {}
): FormattedPost {
  const {
    cleanText: shouldClean = true,
    addEmojis = false,
    emojis = [],
    emojiStrategy = 'distributed',
    addCTA = false,
    cta,
  } = options;

  // Clean title
  let formattedTitle = shouldClean ? cleanText(title) : title;

  // Clean description
  let formattedDescription = shouldClean ? cleanText(description) : description;

  // Add emojis if requested
  if (addEmojis && emojis.length > 0) {
    formattedDescription = insertEmojis(
      formattedDescription,
      emojis,
      emojiStrategy
    );
  }

  // Add CTA if requested
  if (addCTA) {
    formattedDescription = addCallToAction(formattedDescription, cta);
  }

  return {
    title: formattedTitle,
    description: formattedDescription,
    validation: {
      title: validateTitle(formattedTitle),
      description: validateDescription(formattedDescription),
    },
    metadata: {
      wordCount: countWords(formattedDescription),
      characterCount: formattedDescription.length,
      emojiCount: countEmojis(formattedDescription),
    },
  };
}
