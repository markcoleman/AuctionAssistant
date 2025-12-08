/**
 * Confidence Scoring Utility
 * Calculates confidence scores for AI-generated product attributes
 * and provides overall product analysis confidence
 */

import {
  ProductAnalysis,
  ConfidenceLevel,
  ProductCondition,
} from '../types/productAnalysis';

/**
 * Numeric confidence score (0-100)
 */
export type ConfidenceScore = number;

/**
 * Detailed confidence breakdown by attribute
 */
export interface AttributeConfidence {
  productType: ConfidenceScore;
  category: ConfidenceScore;
  brand: ConfidenceScore;
  condition: ConfidenceScore;
  attributes: ConfidenceScore;
  visualQuality: ConfidenceScore;
  overall: ConfidenceScore;
}

/**
 * Convert ConfidenceLevel enum to numeric score
 * @param level - Confidence level enum value
 * @returns Numeric confidence score (0-100)
 */
export function confidenceLevelToScore(
  level: ConfidenceLevel
): ConfidenceScore {
  switch (level) {
    case ConfidenceLevel.HIGH:
      return 85;
    case ConfidenceLevel.MEDIUM:
      return 60;
    case ConfidenceLevel.LOW:
      return 30;
    default:
      return 30;
  }
}

/**
 * Convert numeric score to ConfidenceLevel enum
 * @param score - Numeric confidence score (0-100)
 * @returns Confidence level enum value
 */
export function scoreToConfidenceLevel(
  score: ConfidenceScore
): ConfidenceLevel {
  if (score >= 75) return ConfidenceLevel.HIGH;
  if (score >= 50) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

/**
 * Calculate confidence score for product type identification
 * @param analysis - Product analysis result
 * @returns Confidence score (0-100)
 */
export function calculateProductTypeConfidence(
  analysis: ProductAnalysis
): ConfidenceScore {
  let score = confidenceLevelToScore(analysis.category.confidence);

  // Boost confidence if brand is verified
  if (analysis.brand?.verified) {
    score += 10;
  }

  // Boost confidence if model is identified
  if (analysis.attributes.model) {
    score += 5;
  }

  // Reduce confidence for generic product type
  if (
    analysis.productType.toLowerCase().includes('unknown') ||
    analysis.productType.toLowerCase().includes('generic')
  ) {
    score -= 20;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate confidence score for category classification
 * @param analysis - Product analysis result
 * @returns Confidence score (0-100)
 */
export function calculateCategoryConfidence(
  analysis: ProductAnalysis
): ConfidenceScore {
  let score = confidenceLevelToScore(analysis.category.confidence);

  // Boost if we have secondary and tertiary categories
  if (analysis.category.secondary) score += 5;
  if (analysis.category.tertiary) score += 5;

  // Boost if extracted text confirms category
  const hasRelevantText = analysis.extractedText.some((text) =>
    text.text.toLowerCase().includes(analysis.category.primary.toLowerCase())
  );
  if (hasRelevantText) score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate confidence score for brand identification
 * @param analysis - Product analysis result
 * @returns Confidence score (0-100)
 */
export function calculateBrandConfidence(
  analysis: ProductAnalysis
): ConfidenceScore {
  if (!analysis.brand) return 0;

  let score = confidenceLevelToScore(analysis.brand.confidence);

  // High boost if brand is verified through logo/text
  if (analysis.brand.verified) {
    score += 20;
  }

  // Boost if brand appears in extracted text
  const brandInText = analysis.extractedText.some((text) =>
    text.text.toLowerCase().includes(analysis.brand!.name.toLowerCase())
  );
  if (brandInText) score += 15;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate confidence score for condition assessment
 * @param analysis - Product analysis result
 * @returns Confidence score (0-100)
 */
export function calculateConditionConfidence(
  analysis: ProductAnalysis
): ConfidenceScore {
  let score = confidenceLevelToScore(analysis.conditionConfidence);

  // Reduce confidence if condition is unknown - must be very low
  if (analysis.condition === ProductCondition.UNKNOWN) {
    return Math.min(score, 20);
  }

  // Boost confidence if visual quality is good
  if (analysis.visualQuality.imageQuality === 'excellent') {
    score += 15;
  } else if (analysis.visualQuality.imageQuality === 'good') {
    score += 10;
  }

  // Boost if clarity is sharp
  if (analysis.visualQuality.clarity === 'sharp') {
    score += 10;
  }

  // Reduce confidence if image quality is poor
  if (analysis.visualQuality.imageQuality === 'poor') {
    score -= 20;
  }

  // Boost if defects are detected (shows detailed analysis)
  if (analysis.defects && analysis.defects.description) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate confidence score for extracted attributes
 * @param analysis - Product analysis result
 * @returns Confidence score (0-100)
 */
export function calculateAttributesConfidence(
  analysis: ProductAnalysis
): ConfidenceScore {
  let score = 50; // Base score

  const attrs = analysis.attributes;
  let attributeCount = 0;

  // Count identified attributes
  if (attrs.color && attrs.color.length > 0) attributeCount++;
  if (attrs.material && attrs.material.length > 0) attributeCount++;
  if (attrs.size) attributeCount++;
  if (attrs.style) attributeCount++;
  if (attrs.model) attributeCount++;
  if (attrs.year) attributeCount++;
  if (attrs.dimensions) attributeCount++;
  if (attrs.weight) attributeCount++;

  // More attributes = higher confidence
  score += attributeCount * 5;

  // Boost if we have extracted text (OCR worked)
  if (analysis.extractedText.length > 0) {
    score += 10;
  }

  // Boost if we have high confidence text extractions
  const highConfidenceText = analysis.extractedText.filter(
    (text) => text.confidence === ConfidenceLevel.HIGH
  );
  if (highConfidenceText.length > 0) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate confidence score based on visual quality
 * @param analysis - Product analysis result
 * @returns Confidence score (0-100)
 */
export function calculateVisualQualityConfidence(
  analysis: ProductAnalysis
): ConfidenceScore {
  let score = 50;

  // Image quality impact
  switch (analysis.visualQuality.imageQuality) {
    case 'excellent':
      score += 30;
      break;
    case 'good':
      score += 20;
      break;
    case 'fair':
      score += 10;
      break;
    case 'poor':
      score -= 20;
      break;
  }

  // Lighting impact
  switch (analysis.visualQuality.lighting) {
    case 'good':
      score += 10;
      break;
    case 'fair':
      score += 5;
      break;
    case 'poor':
      score -= 15;
      break;
  }

  // Clarity impact
  switch (analysis.visualQuality.clarity) {
    case 'sharp':
      score += 10;
      break;
    case 'slightly_blurry':
      score += 0;
      break;
    case 'blurry':
      score -= 15;
      break;
  }

  // Background impact
  if (analysis.visualQuality.background === 'clean') {
    score += 5;
  } else if (analysis.visualQuality.background === 'distracting') {
    score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate overall confidence score for product analysis
 * Weighted average of individual confidence scores
 * @param analysis - Product analysis result
 * @returns Overall confidence score (0-100)
 */
export function calculateOverallConfidence(
  analysis: ProductAnalysis
): ConfidenceScore {
  const weights = {
    productType: 0.25,
    category: 0.15,
    brand: 0.15,
    condition: 0.2,
    attributes: 0.15,
    visualQuality: 0.1,
  };

  const scores = {
    productType: calculateProductTypeConfidence(analysis),
    category: calculateCategoryConfidence(analysis),
    brand: calculateBrandConfidence(analysis),
    condition: calculateConditionConfidence(analysis),
    attributes: calculateAttributesConfidence(analysis),
    visualQuality: calculateVisualQualityConfidence(analysis),
  };

  const overall =
    scores.productType * weights.productType +
    scores.category * weights.category +
    scores.brand * weights.brand +
    scores.condition * weights.condition +
    scores.attributes * weights.attributes +
    scores.visualQuality * weights.visualQuality;

  return Math.round(overall);
}

/**
 * Get detailed confidence breakdown for all attributes
 * @param analysis - Product analysis result
 * @returns Detailed confidence scores by attribute
 */
export function getConfidenceBreakdown(
  analysis: ProductAnalysis
): AttributeConfidence {
  return {
    productType: calculateProductTypeConfidence(analysis),
    category: calculateCategoryConfidence(analysis),
    brand: calculateBrandConfidence(analysis),
    condition: calculateConditionConfidence(analysis),
    attributes: calculateAttributesConfidence(analysis),
    visualQuality: calculateVisualQualityConfidence(analysis),
    overall: calculateOverallConfidence(analysis),
  };
}

/**
 * Get recommendations to improve confidence scores
 * @param analysis - Product analysis result
 * @returns Array of recommendations
 */
export function getConfidenceRecommendations(
  analysis: ProductAnalysis
): string[] {
  const recommendations: string[] = [];
  const breakdown = getConfidenceBreakdown(analysis);

  // Visual quality recommendations
  if (breakdown.visualQuality < 50) {
    if (analysis.visualQuality.imageQuality === 'poor') {
      recommendations.push(
        'Upload higher quality images for better analysis accuracy'
      );
    }
    if (analysis.visualQuality.lighting === 'poor') {
      recommendations.push(
        'Use better lighting when photographing the product'
      );
    }
    if (analysis.visualQuality.clarity === 'blurry') {
      recommendations.push(
        'Ensure images are in focus and not blurry for better recognition'
      );
    }
    if (analysis.visualQuality.background !== 'clean') {
      recommendations.push(
        'Use a clean, uncluttered background to improve product identification'
      );
    }
  }

  // Product type recommendations
  if (breakdown.productType < 60) {
    recommendations.push(
      'Consider providing additional details about the product type manually'
    );
  }

  // Brand recommendations
  if (breakdown.brand < 60) {
    recommendations.push(
      'If the brand is known, provide it manually to improve accuracy'
    );
  }

  // Condition recommendations
  if (breakdown.condition < 60) {
    recommendations.push(
      'Provide detailed condition information for more accurate listings'
    );
  }

  // Attributes recommendations
  if (breakdown.attributes < 50) {
    recommendations.push(
      'Add missing product attributes (color, size, model, etc.) manually'
    );
  }

  // Add visual quality specific recommendations
  if (
    analysis.visualQuality.recommendations &&
    analysis.visualQuality.recommendations.length > 0
  ) {
    recommendations.push(...analysis.visualQuality.recommendations);
  }

  return recommendations;
}
