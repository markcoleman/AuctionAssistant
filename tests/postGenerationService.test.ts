/**
 * Tests for Post Generation Service
 */

import {
  PostGenerationService,
  createPostGenerationService,
  PostGenerationConfig,
} from '../src/services/postGenerationService';
import {
  MarketplaceTone,
  DescriptionStyle,
} from '../src/prompts/marketplacePrompts';
import {
  ProductAnalysis,
  ProductCondition,
  ConfidenceLevel,
} from '../src/types/productAnalysis';

// Mock OpenAI module
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

// Helper to create mock product analysis
function createMockProductAnalysis(): ProductAnalysis {
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
  };
}

describe('PostGenerationService', () => {
  let service: PostGenerationService;
  const apiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostGenerationService({ apiKey });
  });

  describe('Constructor', () => {
    it('should create service with API key', () => {
      expect(service).toBeInstanceOf(PostGenerationService);
    });

    it('should throw error if API key is missing', () => {
      expect(() => new PostGenerationService({ apiKey: '' })).toThrow(
        'OpenAI API key is required'
      );
    });

    it('should use default configuration', () => {
      const config: PostGenerationConfig = { apiKey };
      const testService = new PostGenerationService(config);
      expect(testService).toBeInstanceOf(PostGenerationService);
    });

    it('should accept custom configuration', () => {
      const config: PostGenerationConfig = {
        apiKey,
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2000,
      };
      const testService = new PostGenerationService(config);
      expect(testService).toBeInstanceOf(PostGenerationService);
    });
  });

  describe('generateTitle', () => {
    it('should generate a title', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'iPhone 13 Pro - Excellent Condition ⭐',
            },
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const analysis = createMockProductAnalysis();
      const result = await service.generateTitle(analysis);

      expect(result.content).toBe('iPhone 13 Pro - Excellent Condition ⭐');
      expect(result.tokensUsed).toBe(50);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should accept tone parameter', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Test Title' } }],
        usage: { total_tokens: 30 },
      });

      const analysis = createMockProductAnalysis();
      await service.generateTitle(analysis, MarketplaceTone.ENTHUSIASTIC);

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateDescription', () => {
    it('should generate a description', async () => {
      const mockDescription = 'This is a great iPhone in excellent condition...';
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: mockDescription } }],
        usage: { total_tokens: 200 },
      });

      const analysis = createMockProductAnalysis();
      const result = await service.generateDescription(analysis);

      expect(result.content).toBe(mockDescription);
      expect(result.tokensUsed).toBe(200);
    });

    it('should accept tone and style parameters', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Description' } }],
        usage: { total_tokens: 150 },
      });

      const analysis = createMockProductAnalysis();
      await service.generateDescription(
        analysis,
        MarketplaceTone.LUXURY,
        DescriptionStyle.DETAILED
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should accept custom word count', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Custom description' } }],
        usage: { total_tokens: 180 },
      });

      const analysis = createMockProductAnalysis();
      await service.generateDescription(
        analysis,
        MarketplaceTone.PROFESSIONAL,
        DescriptionStyle.CONCISE,
        { min: 100, max: 300 }
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateSellingPoints', () => {
    it('should generate selling points as JSON array', async () => {
      const mockPoints = [
        'Excellent condition',
        '5G capable',
        'Pro camera system',
      ];
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(mockPoints) } }],
        usage: { total_tokens: 80 },
      });

      const analysis = createMockProductAnalysis();
      const result = await service.generateSellingPoints(analysis);

      expect(result.content).toEqual(mockPoints);
      expect(result.tokensUsed).toBe(80);
    });

    it('should accept custom max points', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '["Point 1", "Point 2", "Point 3"]' } }],
        usage: { total_tokens: 60 },
      });

      const analysis = createMockProductAnalysis();
      await service.generateSellingPoints(analysis, 3);

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Invalid JSON' } }],
        usage: { total_tokens: 40 },
      });

      const analysis = createMockProductAnalysis();
      const result = await service.generateSellingPoints(analysis);

      expect(result.content).toEqual([]);
    });
  });

  describe('generatePost', () => {
    beforeEach(() => {
      // Mock all the API calls needed for generatePost
      mockCreate
        .mockResolvedValueOnce({
          // Title
          choices: [{ message: { content: 'Test Title' } }],
          usage: { total_tokens: 50 },
        })
        .mockResolvedValueOnce({
          // Description
          choices: [{ message: { content: 'Test description content' } }],
          usage: { total_tokens: 200 },
        })
        .mockResolvedValueOnce({
          // Selling points
          choices: [
            { message: { content: '["Point 1", "Point 2", "Point 3"]' } },
          ],
          usage: { total_tokens: 80 },
        });
    });

    it('should generate complete post', async () => {
      const analysis = createMockProductAnalysis();
      const result = await service.generatePost(analysis);

      expect(result.success).toBe(true);
      expect(result.primaryPost).toBeDefined();
      expect(result.primaryPost?.title).toBe('Test Title');
      expect(result.primaryPost?.description).toContain('Test description');
      expect(result.primaryPost?.sellingPoints).toHaveLength(3);
    });

    it('should include validation results', async () => {
      const analysis = createMockProductAnalysis();
      const result = await service.generatePost(analysis);

      expect(result.primaryPost?.validation.title).toBeDefined();
      expect(result.primaryPost?.validation.description).toBeDefined();
    });

    it('should include metadata', async () => {
      const analysis = createMockProductAnalysis();
      const result = await service.generatePost(analysis);

      expect(result.primaryPost?.metadata.wordCount).toBeGreaterThanOrEqual(0);
      expect(result.primaryPost?.metadata.characterCount).toBeGreaterThan(0);
      expect(result.primaryPost?.metadata.tokensUsed).toBeGreaterThan(0);
    });

    it('should use specified tone and style', async () => {
      const analysis = createMockProductAnalysis();
      const result = await service.generatePost(analysis, {
        tone: MarketplaceTone.ENTHUSIASTIC,
        style: DescriptionStyle.BENEFIT_FOCUSED,
      });

      expect(result.primaryPost?.tone).toBe(MarketplaceTone.ENTHUSIASTIC);
      expect(result.primaryPost?.style).toBe(DescriptionStyle.BENEFIT_FOCUSED);
    });

    it('should include emojis when requested', async () => {
      const analysis = createMockProductAnalysis();
      const result = await service.generatePost(analysis, {
        includeEmojis: true,
      });

      expect(result.primaryPost?.emojis).toBeDefined();
      expect(result.primaryPost?.emojis.length).toBeGreaterThan(0);
    });

    it('should add CTA when requested', async () => {
      const customCTA = 'Contact me now!';
      const analysis = createMockProductAnalysis();
      const result = await service.generatePost(analysis, {
        addCTA: true,
        cta: customCTA,
      });

      expect(result.primaryPost?.description).toContain(customCTA);
    });
  });

  describe('generateABTestingVariants', () => {
    it('should generate variants', async () => {
      // Mock the API calls for variants
      mockCreate
        .mockResolvedValueOnce({
          // Variant title
          choices: [{ message: { content: 'Variant Title 1' } }],
          usage: { total_tokens: 50 },
        })
        .mockResolvedValueOnce({
          // Variant description
          choices: [{ message: { content: 'Variant description 1' } }],
          usage: { total_tokens: 200 },
        })
        .mockResolvedValueOnce({
          // Second variant title
          choices: [{ message: { content: 'Variant Title 2' } }],
          usage: { total_tokens: 50 },
        })
        .mockResolvedValueOnce({
          // Second variant description
          choices: [{ message: { content: 'Variant description 2' } }],
          usage: { total_tokens: 200 },
        });

      const analysis = createMockProductAnalysis();
      const primaryPost = {
        title: 'Primary Title',
        description: 'Primary description',
        sellingPoints: ['Point 1'],
        emojis: [],
        tone: MarketplaceTone.PROFESSIONAL,
        style: DescriptionStyle.FEATURE_FOCUSED,
        validation: {
          title: { valid: true, errors: [], warnings: [] },
          description: { valid: true, errors: [], warnings: [] },
        },
        metadata: {
          wordCount: 10,
          characterCount: 50,
          emojiCount: 0,
        },
      };

      const result = await service.generateABTestingVariants(
        analysis,
        primaryPost,
        2
      );

      expect(result.variants).toHaveLength(2);
      expect(result.variants[0].title).toBe('Variant Title 1');
      expect(result.variants[1].title).toBe('Variant Title 2');
      expect(result.tokensUsed).toBeGreaterThan(0);
    });
  });

  describe('regenerateElement', () => {
    it('should regenerate title', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'New Title' } }],
        usage: { total_tokens: 40 },
      });

      const analysis = createMockProductAnalysis();
      const result = await service.regenerateElement(analysis, 'title');

      expect(result.content).toBe('New Title');
    });

    it('should regenerate description', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'New Description' } }],
        usage: { total_tokens: 180 },
      });

      const analysis = createMockProductAnalysis();
      const result = await service.regenerateElement(analysis, 'description');

      expect(result.content).toBe('New Description');
    });

    it('should regenerate selling points', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '["New Point 1", "New Point 2"]' } }],
        usage: { total_tokens: 70 },
      });

      const analysis = createMockProductAnalysis();
      const result = await service.regenerateElement(
        analysis,
        'sellingPoints'
      );

      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should throw error for unknown element', async () => {
      const analysis = createMockProductAnalysis();
      await expect(
        service.regenerateElement(analysis, 'unknown' as 'title')
      ).rejects.toThrow('Unknown element');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors', async () => {
      const apiError = {
        status: 429,
        code: 'rate_limit_exceeded',
        message: 'Rate limit exceeded',
      };
      mockCreate.mockRejectedValueOnce(apiError);

      const analysis = createMockProductAnalysis();
      const result = await service.generatePost(analysis);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle general errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network error'));

      const analysis = createMockProductAnalysis();
      const result = await service.generatePost(analysis);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Network error');
    });
  });
});

describe('createPostGenerationService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should create service with API key from environment', () => {
    process.env.OPENAI_API_KEY = 'env-api-key';
    const service = createPostGenerationService();
    expect(service).toBeInstanceOf(PostGenerationService);
  });

  it('should create service with provided API key', () => {
    const service = createPostGenerationService('provided-api-key');
    expect(service).toBeInstanceOf(PostGenerationService);
  });

  it('should throw error if no API key is available', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => createPostGenerationService()).toThrow(
      'OpenAI API key not provided'
    );
  });

  it('should use environment variables for configuration', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_POST_MODEL = 'gpt-4-turbo';
    process.env.OPENAI_POST_TEMPERATURE = '0.8';
    process.env.OPENAI_POST_MAX_TOKENS = '1500';

    const service = createPostGenerationService();
    expect(service).toBeInstanceOf(PostGenerationService);
  });
});
