/**
 * Tests for Marketplace Prompts
 */

import {
  MarketplaceTone,
  DescriptionStyle,
  getTitlePrompt,
  getDescriptionPrompt,
  getSellingPointsPrompt,
  getABTestingPrompt,
  getEmojiSuggestionPrompt,
  getRecommendedTone,
  getFormattingPrompt,
} from '../src/prompts/marketplacePrompts';
import {
  ProductAnalysis,
  ProductCondition,
  ConfidenceLevel,
} from '../src/types/productAnalysis';

// Helper to create a mock product analysis
function createMockProductAnalysis(
  overrides: Partial<ProductAnalysis> = {}
): ProductAnalysis {
  return {
    productType: 'Apple iPhone 13 Pro',
    category: {
      primary: 'Electronics',
      secondary: 'Smartphones',
      confidence: ConfidenceLevel.HIGH,
    },
    brand: {
      name: 'Apple',
      confidence: ConfidenceLevel.HIGH,
      verified: true,
    },
    condition: ProductCondition.EXCELLENT,
    conditionConfidence: ConfidenceLevel.HIGH,
    attributes: {
      color: ['Graphite'],
      model: 'iPhone 13 Pro',
      year: '2021',
    },
    extractedText: [],
    features: ['5G capable', '128GB storage', 'Pro camera system'],
    visualQuality: {
      imageQuality: 'excellent',
      lighting: 'good',
      clarity: 'sharp',
      background: 'clean',
    },
    description: 'High-quality smartphone in excellent condition',
    suggestedTitle: 'iPhone 13 Pro - Excellent Condition',
    suggestedKeywords: ['iphone', 'apple', 'smartphone'],
    overallConfidence: ConfidenceLevel.HIGH,
    analysisTimestamp: new Date(),
    ...overrides,
  };
}

describe('Marketplace Prompts - Title Generation', () => {
  it('should generate title prompt with product details', () => {
    const analysis = createMockProductAnalysis();
    const prompt = getTitlePrompt(analysis);

    expect(prompt).toContain('Apple iPhone 13 Pro');
    expect(prompt).toContain('Apple');
    expect(prompt).toContain('excellent');
    expect(prompt).toContain('50-80 characters');
  });

  it('should include tone in prompt', () => {
    const analysis = createMockProductAnalysis();
    const prompt = getTitlePrompt(analysis, MarketplaceTone.ENTHUSIASTIC);

    expect(prompt).toContain('enthusiastic');
  });

  it('should include color when available', () => {
    const analysis = createMockProductAnalysis({
      attributes: { color: ['Blue', 'Silver'] },
    });
    const prompt = getTitlePrompt(analysis);

    expect(prompt).toContain('Blue, Silver');
  });

  it('should handle missing brand', () => {
    const analysis = createMockProductAnalysis({ brand: undefined });
    const prompt = getTitlePrompt(analysis);

    expect(prompt).toContain('Unknown');
  });

  it('should include model when available', () => {
    const analysis = createMockProductAnalysis({
      attributes: { model: 'Pro Max' },
    });
    const prompt = getTitlePrompt(analysis);

    expect(prompt).toContain('Pro Max');
  });
});

describe('Marketplace Prompts - Description Generation', () => {
  it('should generate description prompt with product details', () => {
    const analysis = createMockProductAnalysis();
    const prompt = getDescriptionPrompt(analysis);

    expect(prompt).toContain('Apple iPhone 13 Pro');
    expect(prompt).toContain('200-500 words');
    expect(prompt).toContain('5G capable');
  });

  it('should include tone and style', () => {
    const analysis = createMockProductAnalysis();
    const prompt = getDescriptionPrompt(
      analysis,
      MarketplaceTone.LUXURY,
      DescriptionStyle.DETAILED
    );

    expect(prompt).toContain('luxury');
    expect(prompt).toContain('detailed');
  });

  it('should include custom word count', () => {
    const analysis = createMockProductAnalysis();
    const prompt = getDescriptionPrompt(
      analysis,
      MarketplaceTone.PROFESSIONAL,
      DescriptionStyle.FEATURE_FOCUSED,
      { min: 300, max: 600 }
    );

    expect(prompt).toContain('300-600 words');
  });

  it('should include defects if present', () => {
    const analysis = createMockProductAnalysis({
      defects: {
        scratches: true,
        description: 'Minor scratches on back',
        severity: 'minor',
      },
    });
    const prompt = getDescriptionPrompt(analysis);

    expect(prompt).toContain('Minor scratches on back');
    expect(prompt).toContain('minor');
  });

  it('should include attributes', () => {
    const analysis = createMockProductAnalysis({
      attributes: {
        color: ['Red'],
        material: ['Aluminum'],
        size: 'Large',
      },
    });
    const prompt = getDescriptionPrompt(analysis);

    expect(prompt).toContain('Red');
    expect(prompt).toContain('Aluminum');
    expect(prompt).toContain('Large');
  });
});

describe('Marketplace Prompts - Selling Points', () => {
  it('should generate selling points prompt', () => {
    const analysis = createMockProductAnalysis();
    const prompt = getSellingPointsPrompt(analysis);

    expect(prompt).toContain('Apple iPhone 13 Pro');
    expect(prompt).toContain('5 most compelling selling points');
  });

  it('should allow custom max points', () => {
    const analysis = createMockProductAnalysis();
    const prompt = getSellingPointsPrompt(analysis, 3);

    expect(prompt).toContain('3 most compelling selling points');
    expect(prompt).toContain('exactly 3 selling points');
  });

  it('should include features', () => {
    const analysis = createMockProductAnalysis({
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    });
    const prompt = getSellingPointsPrompt(analysis);

    expect(prompt).toContain('Feature 1');
    expect(prompt).toContain('Feature 2');
  });
});

describe('Marketplace Prompts - A/B Testing', () => {
  const analysis = createMockProductAnalysis();

  it('should generate A/B testing prompt for title', () => {
    const originalTitle = 'iPhone 13 Pro - Excellent Condition';
    const prompt = getABTestingPrompt(analysis, 'title', originalTitle);

    expect(prompt).toContain(originalTitle);
    expect(prompt).toContain('alternative version');
    expect(prompt).toContain('50-80 characters');
  });

  it('should generate A/B testing prompt for description', () => {
    const originalDescription = 'Great phone in excellent condition...';
    const prompt = getABTestingPrompt(
      analysis,
      'description',
      originalDescription
    );

    expect(prompt).toContain(originalDescription);
    expect(prompt).toContain('alternative version');
  });

  it('should reference product type', () => {
    const prompt = getABTestingPrompt(analysis, 'title', 'Some title');
    expect(prompt).toContain('Apple iPhone 13 Pro');
  });
});

describe('Marketplace Prompts - Emoji Suggestions', () => {
  it('should generate emoji suggestion prompt', () => {
    const prompt = getEmojiSuggestionPrompt('Electronics', 'smartphone');

    expect(prompt).toContain('Electronics');
    expect(prompt).toContain('smartphone');
    expect(prompt).toContain('3-5 relevant emojis');
  });

  it('should request JSON array format', () => {
    const prompt = getEmojiSuggestionPrompt('Furniture', 'chair');
    expect(prompt).toContain('JSON array');
  });
});

describe('Marketplace Prompts - Tone Recommendations', () => {
  it('should recommend luxury tone for luxury items in good condition', () => {
    const tone = getRecommendedTone(ProductCondition.LIKE_NEW, 'Luxury Watch');
    expect(tone).toBe(MarketplaceTone.LUXURY);
  });

  it('should recommend luxury tone for jewelry in new condition', () => {
    const tone = getRecommendedTone(ProductCondition.NEW, 'Diamond Jewelry');
    expect(tone).toBe(MarketplaceTone.LUXURY);
  });

  it('should recommend bargain tone for poor condition items', () => {
    const tone = getRecommendedTone(ProductCondition.POOR, 'Old Chair');
    expect(tone).toBe(MarketplaceTone.BARGAIN);
  });

  it('should recommend bargain tone for parts items', () => {
    const tone = getRecommendedTone(ProductCondition.FOR_PARTS, 'Broken Phone');
    expect(tone).toBe(MarketplaceTone.BARGAIN);
  });

  it('should recommend casual tone for fair condition items', () => {
    const tone = getRecommendedTone(ProductCondition.FAIR, 'Used Book');
    expect(tone).toBe(MarketplaceTone.CASUAL);
  });

  it('should recommend enthusiastic tone for electronics', () => {
    const tone = getRecommendedTone(ProductCondition.GOOD, 'Gaming Console');
    expect(tone).toBe(MarketplaceTone.ENTHUSIASTIC);
  });

  it('should recommend professional tone as default', () => {
    const tone = getRecommendedTone(ProductCondition.GOOD, 'Office Desk');
    expect(tone).toBe(MarketplaceTone.PROFESSIONAL);
  });
});

describe('Marketplace Prompts - Formatting Guidelines', () => {
  it('should return Facebook marketplace guidelines', () => {
    const guidelines = getFormattingPrompt('facebook');
    expect(guidelines).toContain('Facebook');
    expect(guidelines).toContain('casual');
  });

  it('should return eBay guidelines', () => {
    const guidelines = getFormattingPrompt('ebay');
    expect(guidelines).toContain('eBay');
    expect(guidelines).toContain('Professional');
  });

  it('should return Craigslist guidelines', () => {
    const guidelines = getFormattingPrompt('craigslist');
    expect(guidelines).toContain('Craigslist');
    expect(guidelines).toContain('Simple');
  });

  it('should return OfferUp guidelines', () => {
    const guidelines = getFormattingPrompt('offerup');
    expect(guidelines).toContain('OfferUp');
  });

  it('should return generic guidelines by default', () => {
    const guidelines = getFormattingPrompt('generic');
    expect(guidelines).toContain('General Marketplace');
  });
});

describe('Marketplace Prompts - Enum Values', () => {
  it('should export MarketplaceTone enum', () => {
    expect(MarketplaceTone.PROFESSIONAL).toBe('professional');
    expect(MarketplaceTone.CASUAL).toBe('casual');
    expect(MarketplaceTone.ENTHUSIASTIC).toBe('enthusiastic');
    expect(MarketplaceTone.LUXURY).toBe('luxury');
    expect(MarketplaceTone.BARGAIN).toBe('bargain');
  });

  it('should export DescriptionStyle enum', () => {
    expect(DescriptionStyle.FEATURE_FOCUSED).toBe('feature_focused');
    expect(DescriptionStyle.BENEFIT_FOCUSED).toBe('benefit_focused');
    expect(DescriptionStyle.STORY_BASED).toBe('story_based');
    expect(DescriptionStyle.CONCISE).toBe('concise');
    expect(DescriptionStyle.DETAILED).toBe('detailed');
  });
});
