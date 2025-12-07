/**
 * AI Vision Service
 * Provides product analysis using OpenAI GPT-4 Vision API
 * Identifies product type, brand, condition, features, and extracts text from images
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import {
  ProductAnalysis,
  ProductCondition,
  ConfidenceLevel,
  AnalysisOptions,
  AnalysisResult,
  AnalysisError,
  ProductCategory,
  BrandIdentification,
  ExtractedText,
  VisualQuality,
  ProductAttributes,
  DetectedDefects,
} from '../types/productAnalysis';

/**
 * Configuration for AI Vision Service
 */
export interface AIVisionConfig {
  apiKey: string;
  model?: string; // Default: 'gpt-4-vision-preview' or 'gpt-4o'
  maxTokens?: number;
  temperature?: number;
}

/**
 * AI Vision Service Class
 * Handles product image analysis using OpenAI Vision API
 */
export class AIVisionService {
  private client: OpenAI;
  private config: AIVisionConfig;

  constructor(config: AIVisionConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.config = {
      model: config.model || 'gpt-4o',
      maxTokens: config.maxTokens || 1500,
      temperature: config.temperature || 0.3,
      ...config,
    };

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  /**
   * Analyze a product image and extract detailed information
   * @param imagePath - Path to the image file or base64 encoded image
   * @param options - Analysis options
   * @returns Analysis result with product information
   */
  async analyzeProduct(
    imagePath: string,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const {
      includeOCR = true,
      detailedAnalysis = true,
      generateTitle = true,
      generateKeywords = true,
      maxTokens = this.config.maxTokens,
    } = options;

    try {
      // Read and encode the image
      const imageData = await this.encodeImage(imagePath);

      // Build the analysis prompt
      const prompt = this.buildAnalysisPrompt({
        includeOCR,
        detailedAnalysis,
        generateTitle,
        generateKeywords,
      });

      // Call OpenAI Vision API
      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                  detail: detailedAnalysis ? 'high' : 'auto',
                },
              },
            ],
          },
        ],
        max_tokens: maxTokens,
        temperature: this.config.temperature,
      });

      // Extract the response content
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Parse the AI response into structured data
      const analysis = this.parseAnalysisResponse(content);

      return {
        success: true,
        data: analysis,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Analyze multiple product images
   * @param imagePaths - Array of image file paths
   * @param options - Analysis options
   * @returns Array of analysis results
   */
  async analyzeMultipleProducts(
    imagePaths: string[],
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult[]> {
    const results = await Promise.allSettled(
      imagePaths.map((path) => this.analyzeProduct(path, options))
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return this.handleError(result.reason);
      }
    });
  }

  /**
   * Encode image to base64 data URL
   * @param imagePath - Path to the image file
   * @returns Base64 encoded image data URL
   */
  private async encodeImage(imagePath: string): Promise<string> {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Determine mime type from file extension
      const extension = imagePath.toLowerCase().split('.').pop();
      let mimeType = 'image/jpeg';
      if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'webp') mimeType = 'image/webp';
      else if (extension === 'gif') mimeType = 'image/gif';

      return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
      throw new Error(
        `Failed to read image file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build the analysis prompt based on options
   * @param options - Analysis options
   * @returns Formatted prompt for OpenAI
   */
  private buildAnalysisPrompt(options: {
    includeOCR: boolean;
    detailedAnalysis: boolean;
    generateTitle: boolean;
    generateKeywords: boolean;
  }): string {
    const { includeOCR, detailedAnalysis, generateTitle, generateKeywords } =
      options;

    let prompt = `Analyze this product image and provide detailed information in JSON format. Be thorough and accurate.

Required information:
1. Product Type: Identify what the product is (e.g., "Apple iPhone 13 Pro", "IKEA Office Chair")
2. Category: Primary, secondary, and tertiary categories with confidence levels
3. Brand: Brand name with confidence level and whether it was verified through visible logos/text
4. Condition: Assess the condition (new, like_new, excellent, good, fair, poor, for_parts, unknown)
5. Condition Confidence: How confident you are in the condition assessment (high, medium, low)
6. Attributes: Extract color, material, size, style, model, year, dimensions, and other relevant attributes
7. Features: List notable features and specifications
8. Description: Natural language description (2-3 sentences)
9. Visual Quality: Assess image quality, lighting, clarity, and background
`;

    if (includeOCR) {
      prompt += `10. Extracted Text: Any text visible in the image (labels, tags, packaging) with location and confidence
`;
    }

    if (detailedAnalysis) {
      prompt += `11. Defects: Identify any visible defects, damage, wear, or issues with severity
`;
    }

    if (generateTitle) {
      prompt += `12. Suggested Title: Create an engaging listing title (50-80 characters)
`;
    }

    if (generateKeywords) {
      prompt += `13. Suggested Keywords: Generate 5-10 relevant SEO keywords
`;
    }

    prompt += `
Return ONLY a valid JSON object with this exact structure:
{
  "productType": "string",
  "category": {
    "primary": "string",
    "secondary": "string (optional)",
    "tertiary": "string (optional)",
    "confidence": "high|medium|low"
  },
  "brand": {
    "name": "string",
    "confidence": "high|medium|low",
    "verified": boolean
  },
  "condition": "new|like_new|excellent|good|fair|poor|for_parts|unknown",
  "conditionConfidence": "high|medium|low",
  "attributes": {
    "color": ["string"],
    "material": ["string"],
    "size": "string",
    "style": "string",
    "model": "string",
    "year": "string",
    "dimensions": { "width": "string", "height": "string", "depth": "string" },
    "weight": "string",
    "customAttributes": {}
  },
  "extractedText": [
    { "text": "string", "location": "string", "confidence": "high|medium|low" }
  ],
  "features": ["string"],
  "defects": {
    "scratches": boolean,
    "dents": boolean,
    "stains": boolean,
    "tears": boolean,
    "missingParts": boolean,
    "wear": boolean,
    "description": "string",
    "severity": "minor|moderate|severe"
  },
  "visualQuality": {
    "imageQuality": "excellent|good|fair|poor",
    "lighting": "good|fair|poor",
    "clarity": "sharp|slightly_blurry|blurry",
    "background": "clean|cluttered|distracting",
    "recommendations": ["string"]
  },
  "description": "string",
  "suggestedTitle": "string",
  "suggestedKeywords": ["string"],
  "overallConfidence": "high|medium|low"
}

Note: Include all fields. Use null or empty arrays if information is not available. Be specific and detailed.`;

    return prompt;
  }

  /**
   * Parse the AI response into structured ProductAnalysis
   * @param content - Raw response content from OpenAI
   * @returns Parsed product analysis
   */
  private parseAnalysisResponse(content: string): ProductAnalysis {
    try {
      // Extract JSON from potential markdown code blocks
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonContent);

      // Validate and transform the response
      const analysis: ProductAnalysis = {
        productType: parsed.productType || 'Unknown Product',
        category: this.parseCategory(parsed.category),
        brand: parsed.brand ? this.parseBrand(parsed.brand) : undefined,
        condition:
          (parsed.condition as ProductCondition) || ProductCondition.UNKNOWN,
        conditionConfidence:
          (parsed.conditionConfidence as ConfidenceLevel) ||
          ConfidenceLevel.LOW,
        attributes: this.parseAttributes(parsed.attributes),
        extractedText: this.parseExtractedText(parsed.extractedText),
        features: Array.isArray(parsed.features) ? parsed.features : [],
        defects: parsed.defects ? this.parseDefects(parsed.defects) : undefined,
        visualQuality: this.parseVisualQuality(parsed.visualQuality),
        description: parsed.description || '',
        suggestedTitle: parsed.suggestedTitle || parsed.productType || '',
        suggestedKeywords: Array.isArray(parsed.suggestedKeywords)
          ? parsed.suggestedKeywords
          : [],
        overallConfidence:
          (parsed.overallConfidence as ConfidenceLevel) ||
          ConfidenceLevel.MEDIUM,
        analysisTimestamp: new Date(),
      };

      return analysis;
    } catch (error) {
      throw new Error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }
  }

  /**
   * Parse category information
   */
  private parseCategory(category: unknown): ProductCategory {
    if (typeof category === 'object' && category !== null) {
      const cat = category as Record<string, unknown>;
      return {
        primary: (cat.primary as string) || 'Unknown',
        secondary: cat.secondary as string | undefined,
        tertiary: cat.tertiary as string | undefined,
        confidence: (cat.confidence as ConfidenceLevel) || ConfidenceLevel.LOW,
      };
    }
    return {
      primary: 'Unknown',
      confidence: ConfidenceLevel.LOW,
    };
  }

  /**
   * Parse brand information
   */
  private parseBrand(brand: unknown): BrandIdentification | undefined {
    if (typeof brand === 'object' && brand !== null) {
      const b = brand as Record<string, unknown>;
      return {
        name: (b.name as string) || '',
        confidence: (b.confidence as ConfidenceLevel) || ConfidenceLevel.LOW,
        verified: Boolean(b.verified),
      };
    }
    return undefined;
  }

  /**
   * Parse product attributes
   */
  private parseAttributes(attributes: unknown): ProductAttributes {
    if (typeof attributes === 'object' && attributes !== null) {
      const attr = attributes as Record<string, unknown>;
      return {
        color: Array.isArray(attr.color) ? attr.color : undefined,
        material: Array.isArray(attr.material) ? attr.material : undefined,
        size: attr.size as string | undefined,
        style: attr.style as string | undefined,
        model: attr.model as string | undefined,
        year: attr.year as string | undefined,
        dimensions:
          typeof attr.dimensions === 'object' && attr.dimensions !== null
            ? (attr.dimensions as ProductAttributes['dimensions'])
            : undefined,
        weight: attr.weight as string | undefined,
        customAttributes:
          typeof attr.customAttributes === 'object' &&
          attr.customAttributes !== null
            ? (attr.customAttributes as Record<string, string>)
            : undefined,
      };
    }
    return {};
  }

  /**
   * Parse extracted text array
   */
  private parseExtractedText(texts: unknown): ExtractedText[] {
    if (Array.isArray(texts)) {
      return texts
        .filter((t) => typeof t === 'object' && t !== null && t.text)
        .map((t) => ({
          text: t.text,
          location: t.location,
          confidence: (t.confidence as ConfidenceLevel) || ConfidenceLevel.LOW,
        }));
    }
    return [];
  }

  /**
   * Parse defects information
   */
  private parseDefects(defects: unknown): DetectedDefects | undefined {
    if (typeof defects === 'object' && defects !== null) {
      const d = defects as Record<string, unknown>;
      return {
        scratches: Boolean(d.scratches),
        dents: Boolean(d.dents),
        stains: Boolean(d.stains),
        tears: Boolean(d.tears),
        missingParts: Boolean(d.missingParts),
        wear: Boolean(d.wear),
        description: d.description as string | undefined,
        severity: d.severity as 'minor' | 'moderate' | 'severe' | undefined,
      };
    }
    return undefined;
  }

  /**
   * Parse visual quality information
   */
  private parseVisualQuality(quality: unknown): VisualQuality {
    if (typeof quality === 'object' && quality !== null) {
      const q = quality as Record<string, unknown>;
      return {
        imageQuality:
          (q.imageQuality as VisualQuality['imageQuality']) || 'fair',
        lighting: (q.lighting as VisualQuality['lighting']) || 'fair',
        clarity: (q.clarity as VisualQuality['clarity']) || 'slightly_blurry',
        background: (q.background as VisualQuality['background']) || 'clean',
        recommendations: Array.isArray(q.recommendations)
          ? q.recommendations
          : undefined,
      };
    }
    return {
      imageQuality: 'fair',
      lighting: 'fair',
      clarity: 'slightly_blurry',
      background: 'clean',
    };
  }

  /**
   * Handle errors and return structured error result
   * @param error - The error that occurred
   * @returns Analysis result with error information
   */
  private handleError(error: unknown): AnalysisResult {
    let analysisError: AnalysisError;

    // Check if error has OpenAI API error properties
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      'code' in error
    ) {
      // Handle OpenAI API specific errors
      const apiError = error as {
        status?: number;
        code?: string;
        type?: string;
        message: string;
      };
      analysisError = {
        code: apiError.code || 'OPENAI_API_ERROR',
        message: apiError.message,
        details: {
          status: apiError.status,
          type: apiError.type,
        },
        retryable: apiError.status === 429 || (apiError.status ?? 0) >= 500,
      };
    } else if (error instanceof Error) {
      // Handle general errors
      analysisError = {
        code: 'ANALYSIS_ERROR',
        message: error.message,
        details: error,
        retryable: false,
      };
    } else {
      // Handle unknown errors
      analysisError = {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred during analysis',
        details: error,
        retryable: false,
      };
    }

    return {
      success: false,
      error: analysisError,
    };
  }
}

/**
 * Create an AI Vision Service instance with configuration from environment
 */
export function createAIVisionService(apiKey?: string): AIVisionService {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      'OpenAI API key not provided. Set OPENAI_API_KEY environment variable or pass it to createAIVisionService.'
    );
  }

  return new AIVisionService({
    apiKey: key,
    model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1500', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
  });
}
