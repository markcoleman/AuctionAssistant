/**
 * Tests for Post Formatter Utilities
 */

import {
  validateTitle,
  validateDescription,
  countWords,
  countEmojis,
  insertEmojis,
  suggestEmojis,
  formatBulletPoints,
  formatNumberedList,
  formatParagraphs,
  capitalizeFirstLetter,
  normalizeExclamation,
  truncateToWordLimit,
  cleanText,
  formatPrice,
  addCallToAction,
  formatMarketplacePost,
  CHARACTER_LIMITS,
} from '../src/utils/postFormatter';

describe('Post Formatter - Validation', () => {
  describe('validateTitle', () => {
    it('should validate title within character limits', () => {
      const title = 'iPhone 13 Pro 128GB - Excellent Condition, Unlocked ⭐'; // 55 chars
      const result = validateTitle(title);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject title that is too short', () => {
      const title = 'iPhone 13';
      const result = validateTitle(title);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('too short');
    });

    it('should reject title that is too long', () => {
      const title = 'A'.repeat(100);
      const result = validateTitle(title);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('too long');
    });

    it('should warn about excessive capitalization', () => {
      const title = 'IPHONE 13 PRO - EXCELLENT CONDITION - UNLOCKED SMARTPHONE';
      const result = validateTitle(title);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about excessive punctuation', () => {
      const title = 'iPhone 13 Pro!!! Amazing Deal!!! Unlocked!!!';
      const result = validateTitle(title);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateDescription', () => {
    it('should validate description with correct word count', () => {
      const description = 'word '.repeat(250);
      const result = validateDescription(description, 200, 500);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject description that is too short', () => {
      const description = 'word '.repeat(50);
      const result = validateDescription(description, 200, 500);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('too short');
    });

    it('should reject description that is too long', () => {
      const description = 'word '.repeat(600);
      const result = validateDescription(description, 200, 500);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('too long');
    });

    it('should warn about too many emojis', () => {
      const description = 'word '.repeat(250) + '😀😁😂🤣😃😄😅😆😉😊😋';
      const result = validateDescription(description);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('Post Formatter - Text Processing', () => {
  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
      expect(countWords('  spaced   text  ')).toBe(2);
    });

    it('should handle empty strings', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });
  });

  describe('countEmojis', () => {
    it('should count emojis correctly', () => {
      expect(countEmojis('Hello 😀 World 😁')).toBe(2);
      expect(countEmojis('✨💫🌟')).toBe(3);
    });

    it('should return 0 for text without emojis', () => {
      expect(countEmojis('Hello World')).toBe(0);
    });
  });

  describe('insertEmojis', () => {
    it('should insert emojis at start', () => {
      const text = 'Hello world';
      const result = insertEmojis(text, ['✨', '⭐'], 'start');
      expect(result).toBe('✨ ⭐ Hello world');
    });

    it('should insert emojis at end', () => {
      const text = 'Hello world';
      const result = insertEmojis(text, ['✨', '⭐'], 'end');
      expect(result).toBe('Hello world ✨ ⭐');
    });

    it('should distribute emojis throughout text', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = insertEmojis(text, ['✨', '⭐'], 'distributed');
      expect(result).toContain('✨');
      expect(result).toContain('⭐');
    });

    it('should handle empty emoji array', () => {
      const text = 'Hello world';
      const result = insertEmojis(text, [], 'start');
      expect(result).toBe('Hello world');
    });
  });

  describe('suggestEmojis', () => {
    it('should suggest emojis for electronics category', () => {
      const emojis = suggestEmojis('electronics', 'excellent', 3);
      expect(emojis).toHaveLength(3);
      expect(emojis.every((e) => typeof e === 'string')).toBe(true);
    });

    it('should suggest emojis for furniture category', () => {
      const emojis = suggestEmojis('furniture', 'good', 3);
      expect(emojis).toHaveLength(3);
    });

    it('should return unique emojis', () => {
      const emojis = suggestEmojis('electronics', 'new', 5);
      const uniqueEmojis = new Set(emojis);
      expect(uniqueEmojis.size).toBe(emojis.length);
    });
  });

  describe('capitalizeFirstLetter', () => {
    it('should capitalize first letter of sentences', () => {
      const text = 'hello world. this is a test.';
      const result = capitalizeFirstLetter(text);
      expect(result).toBe('Hello world. This is a test.');
    });

    it('should handle text starting with lowercase', () => {
      const text = 'hello world';
      const result = capitalizeFirstLetter(text);
      expect(result).toBe('Hello world');
    });
  });

  describe('normalizeExclamation', () => {
    it('should normalize multiple exclamation marks', () => {
      const text = 'Amazing!!! Great!!!';
      const result = normalizeExclamation(text);
      expect(result).toBe('Amazing! Great!');
    });

    it('should normalize multiple question marks', () => {
      const text = 'Really??? Why???';
      const result = normalizeExclamation(text);
      expect(result).toBe('Really? Why?');
    });
  });

  describe('truncateToWordLimit', () => {
    it('should truncate text to word limit', () => {
      const text = 'word '.repeat(100);
      const result = truncateToWordLimit(text, 50);
      const wordCount = result.split(/\s+/).filter((w) => w.length > 0).length;
      expect(wordCount).toBeLessThanOrEqual(51); // Allow for ellipsis
    });

    it('should not truncate if within limit', () => {
      const text = 'word '.repeat(50);
      const result = truncateToWordLimit(text, 100);
      expect(result).toBe(text);
    });

    it('should try to end at sentence boundary', () => {
      const text =
        'This is the first sentence. This is the second sentence. ' +
        'word '.repeat(100);
      const result = truncateToWordLimit(text, 20);
      // Should contain the period from sentence ending
      expect(result).toContain('.');
    });
  });

  describe('cleanText', () => {
    it('should remove extra whitespace', () => {
      const text = 'Hello    world    test';
      const result = cleanText(text);
      expect(result).toBe('Hello world test');
    });

    it('should normalize line breaks', () => {
      const text = 'Hello\n\n\n\nworld';
      const result = cleanText(text);
      expect(result).toBe('Hello\n\nworld');
    });

    it('should capitalize and normalize punctuation', () => {
      const text = 'hello!!! world???';
      const result = cleanText(text);
      expect(result).toBe('Hello! World?');
    });
  });
});

describe('Post Formatter - Formatting Functions', () => {
  describe('formatBulletPoints', () => {
    it('should format items as bullet points', () => {
      const items = ['Feature 1', 'Feature 2', 'Feature 3'];
      const result = formatBulletPoints(items);
      expect(result).toBe('• Feature 1\n• Feature 2\n• Feature 3');
    });

    it('should handle empty array', () => {
      const result = formatBulletPoints([]);
      expect(result).toBe('');
    });
  });

  describe('formatNumberedList', () => {
    it('should format items as numbered list', () => {
      const items = ['First', 'Second', 'Third'];
      const result = formatNumberedList(items);
      expect(result).toBe('1. First\n2. Second\n3. Third');
    });

    it('should handle empty array', () => {
      const result = formatNumberedList([]);
      expect(result).toBe('');
    });
  });

  describe('formatParagraphs', () => {
    it('should format text with proper paragraph spacing', () => {
      const text = 'Paragraph 1\n\n\nParagraph 2\n\nParagraph 3';
      const result = formatParagraphs(text);
      expect(result).toBe('Paragraph 1\n\nParagraph 2\n\nParagraph 3');
    });

    it('should remove empty paragraphs', () => {
      const text = 'Para 1\n\n\n\nPara 2';
      const result = formatParagraphs(text);
      expect(result).not.toContain('\n\n\n');
    });
  });

  describe('formatPrice', () => {
    it('should format price in USD', () => {
      const result = formatPrice(1234.56, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,235');
    });

    it('should format price without decimals', () => {
      const result = formatPrice(100, 'USD');
      expect(result).toBe('$100');
    });
  });

  describe('addCallToAction', () => {
    it('should add CTA to description', () => {
      const description = 'Great product';
      const cta = 'Buy now!';
      const result = addCallToAction(description, cta);
      expect(result).toBe('Great product\n\nBuy now!');
    });

    it('should use default CTA if not provided', () => {
      const description = 'Great product';
      const result = addCallToAction(description);
      expect(result).toContain('Message me');
    });
  });
});

describe('Post Formatter - Complete Formatting', () => {
  describe('formatMarketplacePost', () => {
    const title = 'iPhone 13 Pro 128GB - Excellent Condition, Unlocked ⭐'; // 55 chars
    const description =
      'This is a great product. It has many features. You will love it. ' +
      'word '.repeat(200);

    it('should format complete post with default options', () => {
      const result = formatMarketplacePost(title, description);
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.validation.title).toBeDefined();
      expect(result.validation.description).toBeDefined();
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should clean text when option is enabled', () => {
      const dirtyTitle = 'iPhone!!!    Pro';
      const result = formatMarketplacePost(dirtyTitle, description, {
        cleanText: true,
      });
      expect(result.title).not.toContain('   ');
      expect(result.title).not.toContain('!!!');
    });

    it('should add emojis when requested', () => {
      const result = formatMarketplacePost(title, description, {
        addEmojis: true,
        emojis: ['✨', '⭐'],
      });
      // Emojis should be in the description
      expect(result.description).toMatch(/[✨⭐]/);
    });

    it('should add CTA when requested', () => {
      const result = formatMarketplacePost(title, description, {
        addCTA: true,
        cta: 'Contact me!',
      });
      expect(result.description).toContain('Contact me!');
    });

    it('should include validation results', () => {
      const result = formatMarketplacePost(title, description);
      expect(result.validation.title.valid).toBeDefined();
      expect(result.validation.description.valid).toBeDefined();
    });

    it('should include metadata', () => {
      const result = formatMarketplacePost(title, description);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.characterCount).toBeGreaterThan(0);
      expect(result.metadata.emojiCount).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Post Formatter - Constants', () => {
  it('should export CHARACTER_LIMITS', () => {
    expect(CHARACTER_LIMITS.title.min).toBe(50);
    expect(CHARACTER_LIMITS.title.max).toBe(80);
    expect(CHARACTER_LIMITS.description.min).toBe(200);
    expect(CHARACTER_LIMITS.description.max).toBe(500);
  });
});
