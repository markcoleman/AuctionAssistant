/**
 * Product Enrichment Service
 * Enhances product analysis with additional data sources:
 * - Product database lookup (UPC/barcode scanning)
 * - Sentiment analysis for condition assessment
 * - Completeness checker
 * - Confidence scoring integration
 */

import {
  ProductAnalysis,
  ProductCondition,
  ConfidenceLevel,
} from '../types/productAnalysis';
import {
  getConfidenceBreakdown,
  getConfidenceRecommendations,
  AttributeConfidence,
  calculateOverallConfidence,
  scoreToConfidenceLevel,
} from '../utils/confidenceScoring';

/**
 * Product database entry for caching known products
 */
export interface ProductDatabaseEntry {
  upc?: string; // Universal Product Code
  ean?: string; // European Article Number
  isbn?: string; // International Standard Book Number
  asin?: string; // Amazon Standard Identification Number
  productName: string;
  brand: string;
  category: string;
  manufacturer?: string;
  model?: string;
  attributes?: Record<string, string>;
  lastUpdated: Date;
}

/**
 * Enriched product analysis with additional metadata
 */
export interface EnrichedProductAnalysis extends ProductAnalysis {
  // Enrichment metadata
  enrichmentData: {
    confidenceScores: AttributeConfidence;
    recommendations: string[];
    completenessScore: number; // 0-100
    missingCriticalInfo: string[];
    databaseMatch?: ProductDatabaseEntry;
    sentimentScore?: number; // -1 to 1 for condition sentiment
  };
}

/**
 * Options for product enrichment
 */
export interface EnrichmentOptions {
  enableDatabaseLookup?: boolean;
  enableSentimentAnalysis?: boolean;
  enableCompletenessCheck?: boolean;
  requireMinimumConfidence?: number; // Minimum confidence threshold (0-100)
}

/**
 * Product Enrichment Service
 * Enhances AI analysis with additional data and validation
 */
export class ProductEnrichmentService {
  private productCache: Map<string, ProductDatabaseEntry>;

  constructor() {
    this.productCache = new Map();
  }

  /**
   * Enrich product analysis with additional data and confidence scoring
   * @param analysis - Base product analysis from AI vision service
   * @param options - Enrichment options
   * @returns Enriched product analysis
   */
  async enrichProductAnalysis(
    analysis: ProductAnalysis,
    options: EnrichmentOptions = {}
  ): Promise<EnrichedProductAnalysis> {
    const {
      enableDatabaseLookup = true,
      enableSentimentAnalysis = true,
      enableCompletenessCheck = true,
    } = options;

    // Calculate confidence scores
    const confidenceScores = getConfidenceBreakdown(analysis);

    // Get recommendations
    const recommendations = getConfidenceRecommendations(analysis);

    // Check for database match if enabled
    let databaseMatch: ProductDatabaseEntry | undefined;
    if (enableDatabaseLookup) {
      databaseMatch = await this.lookupProductInDatabase(analysis);
      if (databaseMatch) {
        recommendations.push(
          `Product matched in database: ${databaseMatch.productName}`
        );
      }
    }

    // Perform sentiment analysis on condition if enabled
    let sentimentScore: number | undefined;
    if (enableSentimentAnalysis) {
      sentimentScore = this.analyzeSentiment(analysis);
    }

    // Check completeness
    const { completenessScore, missingCriticalInfo } = enableCompletenessCheck
      ? this.checkCompleteness(analysis)
      : { completenessScore: 100, missingCriticalInfo: [] };

    // Create enriched analysis
    const enriched: EnrichedProductAnalysis = {
      ...analysis,
      enrichmentData: {
        confidenceScores,
        recommendations,
        completenessScore,
        missingCriticalInfo,
        databaseMatch,
        sentimentScore,
      },
    };

    return enriched;
  }

  /**
   * Look up product in database by UPC, brand/model, or other identifiers
   * @param analysis - Product analysis to search for
   * @returns Database entry if found, undefined otherwise
   */
  private async lookupProductInDatabase(
    analysis: ProductAnalysis
  ): Promise<ProductDatabaseEntry | undefined> {
    // Check if we have identifiers in extracted text
    const upcMatch = this.extractUPC(analysis.extractedText.map((t) => t.text));
    if (upcMatch) {
      const cached = this.productCache.get(upcMatch);
      if (cached) return cached;

      // In a real implementation, this would query an external API or database
      // For now, we'll return undefined as this is a placeholder
    }

    // Try to match by brand and model
    if (analysis.brand && analysis.attributes.model) {
      const key = `${analysis.brand.name}:${analysis.attributes.model}`;
      const cached = this.productCache.get(key);
      if (cached) return cached;
    }

    return undefined;
  }

  /**
   * Extract UPC/barcode from text array
   * @param texts - Array of text strings
   * @returns UPC if found, undefined otherwise
   */
  private extractUPC(texts: string[]): string | undefined {
    // UPC-A: 12 digits
    // EAN-13: 13 digits
    const upcPattern = /\b\d{12,13}\b/;

    for (const text of texts) {
      const match = text.match(upcPattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Analyze sentiment of condition description and defects
   * Returns a score from -1 (very negative/poor condition) to 1 (very positive/excellent condition)
   * @param analysis - Product analysis
   * @returns Sentiment score
   */
  private analyzeSentiment(analysis: ProductAnalysis): number {
    let score = 0;

    // Condition-based sentiment
    switch (analysis.condition) {
      case ProductCondition.NEW:
        score += 1.0;
        break;
      case ProductCondition.LIKE_NEW:
        score += 0.8;
        break;
      case ProductCondition.EXCELLENT:
        score += 0.6;
        break;
      case ProductCondition.GOOD:
        score += 0.4;
        break;
      case ProductCondition.FAIR:
        score += 0.2;
        break;
      case ProductCondition.POOR:
        score -= 0.4;
        break;
      case ProductCondition.FOR_PARTS:
        score -= 0.8;
        break;
      case ProductCondition.UNKNOWN:
        score += 0;
        break;
    }

    // Adjust based on defects
    if (analysis.defects) {
      const defectCount = [
        analysis.defects.scratches,
        analysis.defects.dents,
        analysis.defects.stains,
        analysis.defects.tears,
        analysis.defects.missingParts,
        analysis.defects.wear,
      ].filter(Boolean).length;

      // Each defect reduces sentiment
      score -= defectCount * 0.1;

      // Severity adjustment
      if (analysis.defects.severity === 'severe') {
        score -= 0.3;
      } else if (analysis.defects.severity === 'moderate') {
        score -= 0.15;
      } else if (analysis.defects.severity === 'minor') {
        score -= 0.05;
      }
    }

    // Analyze description for positive/negative keywords
    const description = analysis.description.toLowerCase();
    const positiveKeywords = [
      'excellent',
      'perfect',
      'pristine',
      'mint',
      'flawless',
      'new',
      'unused',
      'original',
      'warranty',
      'certified',
    ];
    const negativeKeywords = [
      'damage',
      'broken',
      'worn',
      'scratched',
      'dented',
      'stained',
      'missing',
      'defect',
      'crack',
      'chip',
    ];

    positiveKeywords.forEach((keyword) => {
      if (description.includes(keyword)) score += 0.05;
    });

    negativeKeywords.forEach((keyword) => {
      if (description.includes(keyword)) score -= 0.05;
    });

    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Check completeness of product data
   * Returns completeness score (0-100) and list of missing critical information
   * @param analysis - Product analysis to check
   * @returns Completeness information
   */
  private checkCompleteness(analysis: ProductAnalysis): {
    completenessScore: number;
    missingCriticalInfo: string[];
  } {
    const missingCriticalInfo: string[] = [];
    let totalFields = 0;
    let completedFields = 0;

    // Critical fields (weighted higher)
    const criticalFields = [
      { name: 'productType', value: analysis.productType, weight: 3 },
      { name: 'condition', value: analysis.condition, weight: 3 },
      { name: 'category', value: analysis.category.primary, weight: 2 },
      {
        name: 'description',
        value: analysis.description && analysis.description.length > 20,
        weight: 2,
      },
      { name: 'suggestedTitle', value: analysis.suggestedTitle, weight: 2 },
    ];

    criticalFields.forEach((field) => {
      totalFields += field.weight;
      if (
        field.value &&
        field.value !== ProductCondition.UNKNOWN &&
        field.value !== 'Unknown' &&
        field.value !== 'Unknown Product'
      ) {
        completedFields += field.weight;
      } else {
        missingCriticalInfo.push(field.name);
      }
    });

    // Important optional fields (weighted lower)
    const optionalFields = [
      { name: 'brand', value: analysis.brand?.name, weight: 1.5 },
      { name: 'color', value: analysis.attributes.color, weight: 1 },
      { name: 'model', value: analysis.attributes.model, weight: 1.5 },
      { name: 'size', value: analysis.attributes.size, weight: 1 },
      { name: 'material', value: analysis.attributes.material, weight: 1 },
    ];

    optionalFields.forEach((field) => {
      totalFields += field.weight;
      if (
        field.value &&
        (typeof field.value === 'string' ||
          (Array.isArray(field.value) && field.value.length > 0))
      ) {
        completedFields += field.weight;
      } else if (!missingCriticalInfo.includes(field.name)) {
        missingCriticalInfo.push(field.name);
      }
    });

    // Visual quality impact
    totalFields += 1;
    if (
      analysis.visualQuality.imageQuality === 'excellent' ||
      analysis.visualQuality.imageQuality === 'good'
    ) {
      completedFields += 1;
    }

    // Features impact
    totalFields += 1;
    if (analysis.features.length > 0) {
      completedFields += 1;
    }

    const completenessScore = Math.round((completedFields / totalFields) * 100);

    return {
      completenessScore,
      missingCriticalInfo,
    };
  }

  /**
   * Add a product to the local cache/database
   * In production, this would write to a persistent database
   * @param entry - Product database entry to cache
   */
  addProductToCache(entry: ProductDatabaseEntry): void {
    // Cache by UPC if available
    if (entry.upc) {
      this.productCache.set(entry.upc, entry);
    }

    // Cache by EAN if available
    if (entry.ean) {
      this.productCache.set(entry.ean, entry);
    }

    // Cache by brand:model combination
    if (entry.brand && entry.model) {
      const key = `${entry.brand}:${entry.model}`;
      this.productCache.set(key, entry);
    }
  }

  /**
   * Get all cached products (for testing/debugging)
   * @returns Array of cached products
   */
  getCachedProducts(): ProductDatabaseEntry[] {
    return Array.from(this.productCache.values());
  }

  /**
   * Clear the product cache
   */
  clearCache(): void {
    this.productCache.clear();
  }

  /**
   * Validate enriched product meets minimum requirements
   * @param enriched - Enriched product analysis
   * @param minConfidence - Minimum required confidence score (0-100)
   * @returns Validation result
   */
  validateEnrichedProduct(
    enriched: EnrichedProductAnalysis,
    minConfidence: number = 50
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check overall confidence
    if (enriched.enrichmentData.confidenceScores.overall < minConfidence) {
      errors.push(
        `Overall confidence score (${enriched.enrichmentData.confidenceScores.overall}) is below minimum required (${minConfidence})`
      );
    }

    // Check completeness
    if (enriched.enrichmentData.completenessScore < 60) {
      warnings.push(
        `Product data is incomplete (${enriched.enrichmentData.completenessScore}% complete)`
      );
    }

    // Check for missing critical info
    if (enriched.enrichmentData.missingCriticalInfo.length > 0) {
      warnings.push(
        `Missing critical information: ${enriched.enrichmentData.missingCriticalInfo.join(', ')}`
      );
    }

    // Check visual quality
    if (enriched.visualQuality.imageQuality === 'poor') {
      warnings.push('Image quality is poor - may affect analysis accuracy');
    }

    // Check if condition is unknown
    if (enriched.condition === ProductCondition.UNKNOWN) {
      errors.push('Product condition could not be determined');
    }

    // Add any enrichment recommendations as warnings
    enriched.enrichmentData.recommendations.forEach((rec) => {
      if (!warnings.includes(rec)) {
        warnings.push(rec);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Update product analysis with database match data
   * @param analysis - Original product analysis
   * @param dbEntry - Database entry to merge
   * @returns Updated product analysis
   */
  mergeWithDatabaseEntry(
    analysis: ProductAnalysis,
    dbEntry: ProductDatabaseEntry
  ): ProductAnalysis {
    return {
      ...analysis,
      // Update product type if database has more specific info
      productType: dbEntry.productName || analysis.productType,
      // Update brand if database match is available
      brand: dbEntry.brand
        ? {
            name: dbEntry.brand,
            confidence: ConfidenceLevel.HIGH,
            verified: true,
          }
        : analysis.brand,
      // Update category if database has it
      category: dbEntry.category
        ? {
            primary: dbEntry.category,
            confidence: ConfidenceLevel.HIGH,
          }
        : analysis.category,
      // Merge attributes
      attributes: {
        ...analysis.attributes,
        model: dbEntry.model || analysis.attributes.model,
        customAttributes: {
          ...(analysis.attributes.customAttributes || {}),
          ...(dbEntry.attributes || {}),
        },
      },
      // Update overall confidence to high since we have a database match
      overallConfidence: scoreToConfidenceLevel(
        Math.max(
          calculateOverallConfidence(analysis),
          85 // Database match gives us high confidence
        )
      ),
    };
  }
}

/**
 * Create a product enrichment service instance
 */
export function createProductEnrichmentService(): ProductEnrichmentService {
  return new ProductEnrichmentService();
}
