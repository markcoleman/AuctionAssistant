/**
 * Post Generation Service
 * Generates engaging marketplace posts using GenAI (OpenAI GPT-4)
 */

import OpenAI from 'openai';
import { ProductAnalysis } from '../types/productAnalysis';
import {
  MarketplaceTone,
  DescriptionStyle,
  getTitlePrompt,
  getDescriptionPrompt,
  getSellingPointsPrompt,
  getABTestingPrompt,
  getRecommendedTone,
} from '../prompts/marketplacePrompts';
import {
  formatMarketplacePost,
  suggestEmojis,
  ValidationResult,
} from '../utils/postFormatter';

/**
 * Configuration for Post Generation Service
 */
export interface PostGenerationConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Options for generating a marketplace post
 */
export interface PostGenerationOptions {
  tone?: MarketplaceTone;
  style?: DescriptionStyle;
  wordCount?: { min: number; max: number };
  includeEmojis?: boolean;
  addCTA?: boolean;
  cta?: string;
  generateVariants?: boolean; // For A/B testing
  variantCount?: number;
}

/**
 * Generated marketplace post
 */
export interface GeneratedPost {
  title: string;
  description: string;
  sellingPoints: string[];
  emojis: string[];
  tone: MarketplaceTone;
  style: DescriptionStyle;
  validation: {
    title: ValidationResult;
    description: ValidationResult;
  };
  metadata: {
    wordCount: number;
    characterCount: number;
    emojiCount: number;
    tokensUsed?: number;
  };
}

/**
 * A/B Testing variant
 */
export interface PostVariant {
  variantId: string;
  title: string;
  description: string;
  differentiatingFactor: string; // What makes this variant different
}

/**
 * Complete post generation result with variants
 */
export interface PostGenerationResult {
  success: boolean;
  primaryPost?: GeneratedPost;
  variants?: PostVariant[];
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  totalTokensUsed?: number;
}

/**
 * Post Generation Service Class
 */
export class PostGenerationService {
  private client: OpenAI;
  private config: PostGenerationConfig;

  constructor(config: PostGenerationConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.config = {
      model: config.model || 'gpt-4o',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
      ...config,
    };

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  /**
   * Generate a complete marketplace post
   */
  async generatePost(
    productAnalysis: ProductAnalysis,
    options: PostGenerationOptions = {}
  ): Promise<PostGenerationResult> {
    try {
      const {
        tone = getRecommendedTone(
          productAnalysis.condition,
          productAnalysis.category.primary
        ),
        style = DescriptionStyle.FEATURE_FOCUSED,
        wordCount = { min: 200, max: 500 },
        includeEmojis = true,
        addCTA = true,
        cta = '💬 Message me for more details or to arrange pickup/delivery!',
        generateVariants = false,
        variantCount = 2,
      } = options;

      let totalTokens = 0;

      // Generate title
      const titleResult = await this.generateTitle(productAnalysis, tone);
      totalTokens += titleResult.tokensUsed || 0;

      // Generate description
      const descriptionResult = await this.generateDescription(
        productAnalysis,
        tone,
        style,
        wordCount
      );
      totalTokens += descriptionResult.tokensUsed || 0;

      // Generate selling points
      const sellingPointsResult =
        await this.generateSellingPoints(productAnalysis);
      totalTokens += sellingPointsResult.tokensUsed || 0;

      // Suggest emojis
      const emojis = includeEmojis
        ? suggestEmojis(
            productAnalysis.category.primary,
            productAnalysis.condition,
            3
          )
        : [];

      // Format the post
      const formatted = formatMarketplacePost(
        titleResult.content,
        descriptionResult.content,
        {
          cleanText: true,
          addEmojis: includeEmojis,
          emojis,
          emojiStrategy: 'distributed',
          addCTA,
          cta,
        }
      );

      const primaryPost: GeneratedPost = {
        title: formatted.title,
        description: formatted.description,
        sellingPoints: sellingPointsResult.content,
        emojis,
        tone,
        style,
        validation: formatted.validation,
        metadata: {
          ...formatted.metadata,
          tokensUsed: totalTokens,
        },
      };

      // Generate A/B testing variants if requested
      let variants: PostVariant[] | undefined;
      if (generateVariants) {
        const variantResults = await this.generateABTestingVariants(
          productAnalysis,
          primaryPost,
          variantCount
        );
        variants = variantResults.variants;
        totalTokens += variantResults.tokensUsed || 0;
      }

      return {
        success: true,
        primaryPost,
        variants,
        totalTokensUsed: totalTokens,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generate an engaging marketplace title
   */
  async generateTitle(
    productAnalysis: ProductAnalysis,
    tone: MarketplaceTone = MarketplaceTone.PROFESSIONAL
  ): Promise<{ content: string; tokensUsed?: number }> {
    const prompt = getTitlePrompt(productAnalysis, tone);

    const response = await this.client.chat.completions.create({
      model: this.config.model!,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert marketplace listing writer who creates compelling, concise titles that drive engagement and sales.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: this.config.temperature,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content?.trim() || '';

    return {
      content,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * Generate a compelling product description
   */
  async generateDescription(
    productAnalysis: ProductAnalysis,
    tone: MarketplaceTone = MarketplaceTone.PROFESSIONAL,
    style: DescriptionStyle = DescriptionStyle.FEATURE_FOCUSED,
    wordCount: { min: number; max: number } = { min: 200, max: 500 }
  ): Promise<{ content: string; tokensUsed?: number }> {
    const prompt = getDescriptionPrompt(
      productAnalysis,
      tone,
      style,
      wordCount
    );

    const response = await this.client.chat.completions.create({
      model: this.config.model!,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert marketplace listing writer who creates engaging, honest, and persuasive product descriptions that highlight key features and benefits while building trust with potential buyers.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim() || '';

    return {
      content,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * Generate key selling points
   */
  async generateSellingPoints(
    productAnalysis: ProductAnalysis,
    maxPoints: number = 5
  ): Promise<{ content: string[]; tokensUsed?: number }> {
    const prompt = getSellingPointsPrompt(productAnalysis, maxPoints);

    const response = await this.client.chat.completions.create({
      model: this.config.model!,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at identifying the most compelling selling points for products.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content?.trim() || '[]';

    // Parse JSON array
    let sellingPoints: string[] = [];
    try {
      sellingPoints = JSON.parse(content);
      if (!Array.isArray(sellingPoints)) {
        sellingPoints = [];
      }
    } catch {
      // If parsing fails, return empty array
      sellingPoints = [];
    }

    return {
      content: sellingPoints,
      tokensUsed: response.usage?.total_tokens,
    };
  }

  /**
   * Generate A/B testing variants
   */
  async generateABTestingVariants(
    productAnalysis: ProductAnalysis,
    primaryPost: GeneratedPost,
    variantCount: number = 2
  ): Promise<{ variants: PostVariant[]; tokensUsed: number }> {
    const variants: PostVariant[] = [];
    let totalTokens = 0;

    // Define different approaches for variants
    const variantApproaches = [
      {
        id: 'variant-benefit-focused',
        description: 'Benefit-focused approach',
        style: DescriptionStyle.BENEFIT_FOCUSED,
      },
      {
        id: 'variant-story-based',
        description: 'Story-based approach',
        style: DescriptionStyle.STORY_BASED,
      },
      {
        id: 'variant-concise',
        description: 'Concise approach',
        style: DescriptionStyle.CONCISE,
      },
      {
        id: 'variant-detailed',
        description: 'Detailed approach',
        style: DescriptionStyle.DETAILED,
      },
    ];

    // Generate variants with different styles
    for (let i = 0; i < Math.min(variantCount, variantApproaches.length); i++) {
      const approach = variantApproaches[i];

      // Skip if this is the same style as primary
      if (approach.style === primaryPost.style) continue;

      try {
        // Generate variant title
        const titlePrompt = getABTestingPrompt(
          productAnalysis,
          'title',
          primaryPost.title
        );

        const titleResponse = await this.client.chat.completions.create({
          model: this.config.model!,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert at creating alternative marketplace listing titles for A/B testing.',
            },
            {
              role: 'user',
              content: titlePrompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 100,
        });

        const variantTitle =
          titleResponse.choices[0]?.message?.content?.trim() || '';
        totalTokens += titleResponse.usage?.total_tokens || 0;

        // Generate variant description using different style
        const descriptionResult = await this.generateDescription(
          productAnalysis,
          primaryPost.tone,
          approach.style,
          { min: 200, max: 500 }
        );
        totalTokens += descriptionResult.tokensUsed || 0;

        variants.push({
          variantId: approach.id,
          title: variantTitle,
          description: descriptionResult.content,
          differentiatingFactor: approach.description,
        });
      } catch (error) {
        // Skip this variant if generation fails
        console.error(`Failed to generate variant ${approach.id}:`, error);
      }
    }

    return {
      variants,
      tokensUsed: totalTokens,
    };
  }

  /**
   * Regenerate specific post element
   */
  async regenerateElement(
    productAnalysis: ProductAnalysis,
    element: 'title' | 'description' | 'sellingPoints',
    options: {
      tone?: MarketplaceTone;
      style?: DescriptionStyle;
    } = {}
  ): Promise<{ content: string | string[]; tokensUsed?: number }> {
    const tone = options.tone || MarketplaceTone.PROFESSIONAL;
    const style = options.style || DescriptionStyle.FEATURE_FOCUSED;

    switch (element) {
      case 'title':
        return await this.generateTitle(productAnalysis, tone);

      case 'description':
        return await this.generateDescription(productAnalysis, tone, style, {
          min: 200,
          max: 500,
        });

      case 'sellingPoints':
        return await this.generateSellingPoints(productAnalysis);

      default:
        throw new Error(`Unknown element: ${element}`);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): PostGenerationResult {
    let errorInfo: PostGenerationResult['error'];

    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      'code' in error
    ) {
      const apiError = error as {
        status?: number;
        code?: string;
        message: string;
      };
      errorInfo = {
        code: apiError.code || 'OPENAI_API_ERROR',
        message: apiError.message,
        retryable: apiError.status === 429 || (apiError.status ?? 0) >= 500,
      };
    } else if (error instanceof Error) {
      errorInfo = {
        code: 'GENERATION_ERROR',
        message: error.message,
        retryable: false,
      };
    } else {
      errorInfo = {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred during post generation',
        retryable: false,
      };
    }

    return {
      success: false,
      error: errorInfo,
    };
  }
}

/**
 * Create a Post Generation Service instance with configuration from environment
 */
export function createPostGenerationService(
  apiKey?: string
): PostGenerationService {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      'OpenAI API key not provided. Set OPENAI_API_KEY environment variable or pass it to createPostGenerationService.'
    );
  }

  return new PostGenerationService({
    apiKey: key,
    model: process.env.OPENAI_POST_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.OPENAI_POST_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_POST_MAX_TOKENS || '1000', 10),
  });
}
