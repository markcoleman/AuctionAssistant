/**
 * Tests for Confidence Scoring Utility
 */

import {
  confidenceLevelToScore,
  scoreToConfidenceLevel,
  calculateProductTypeConfidence,
  calculateCategoryConfidence,
  calculateBrandConfidence,
  calculateConditionConfidence,
  calculateAttributesConfidence,
  calculateVisualQualityConfidence,
  calculateOverallConfidence,
  getConfidenceBreakdown,
  getConfidenceRecommendations,
} from '../src/utils/confidenceScoring';
import {
  ProductAnalysis,
  ConfidenceLevel,
  ProductCondition,
} from '../src/types/productAnalysis';

describe('Confidence Scoring Utility', () => {
  // Helper to create a minimal product analysis
  const createMinimalAnalysis = (): ProductAnalysis => ({
    productType: 'Test Product',
    category: {
      primary: 'Electronics',
      confidence: ConfidenceLevel.MEDIUM,
    },
    condition: ProductCondition.GOOD,
    conditionConfidence: ConfidenceLevel.MEDIUM,
    attributes: {},
    extractedText: [],
    features: [],
    visualQuality: {
      imageQuality: 'good',
      lighting: 'good',
      clarity: 'sharp',
      background: 'clean',
    },
    description: 'Test description',
    suggestedTitle: 'Test Title',
    suggestedKeywords: [],
    overallConfidence: ConfidenceLevel.MEDIUM,
    analysisTimestamp: new Date(),
  });

  describe('confidenceLevelToScore', () => {
    it('should convert HIGH to 85', () => {
      expect(confidenceLevelToScore(ConfidenceLevel.HIGH)).toBe(85);
    });

    it('should convert MEDIUM to 60', () => {
      expect(confidenceLevelToScore(ConfidenceLevel.MEDIUM)).toBe(60);
    });

    it('should convert LOW to 30', () => {
      expect(confidenceLevelToScore(ConfidenceLevel.LOW)).toBe(30);
    });
  });

  describe('scoreToConfidenceLevel', () => {
    it('should convert scores >= 75 to HIGH', () => {
      expect(scoreToConfidenceLevel(85)).toBe(ConfidenceLevel.HIGH);
      expect(scoreToConfidenceLevel(75)).toBe(ConfidenceLevel.HIGH);
    });

    it('should convert scores 50-74 to MEDIUM', () => {
      expect(scoreToConfidenceLevel(60)).toBe(ConfidenceLevel.MEDIUM);
      expect(scoreToConfidenceLevel(50)).toBe(ConfidenceLevel.MEDIUM);
    });

    it('should convert scores < 50 to LOW', () => {
      expect(scoreToConfidenceLevel(30)).toBe(ConfidenceLevel.LOW);
      expect(scoreToConfidenceLevel(0)).toBe(ConfidenceLevel.LOW);
    });
  });

  describe('calculateProductTypeConfidence', () => {
    it('should boost confidence for verified brand', () => {
      const analysis = createMinimalAnalysis();
      analysis.brand = {
        name: 'Apple',
        confidence: ConfidenceLevel.HIGH,
        verified: true,
      };

      const score = calculateProductTypeConfidence(analysis);
      expect(score).toBeGreaterThan(60);
    });

    it('should boost confidence for identified model', () => {
      const analysis = createMinimalAnalysis();
      analysis.attributes.model = 'iPhone 13';

      const score = calculateProductTypeConfidence(analysis);
      expect(score).toBeGreaterThan(60);
    });

    it('should reduce confidence for unknown product type', () => {
      const analysis = createMinimalAnalysis();
      analysis.productType = 'Unknown Product';

      const score = calculateProductTypeConfidence(analysis);
      expect(score).toBeLessThan(60);
    });
  });

  describe('calculateCategoryConfidence', () => {
    it('should boost confidence with secondary category', () => {
      const analysis = createMinimalAnalysis();
      analysis.category.secondary = 'Smartphones';

      const score = calculateCategoryConfidence(analysis);
      expect(score).toBeGreaterThan(60);
    });

    it('should boost confidence with tertiary category', () => {
      const analysis = createMinimalAnalysis();
      analysis.category.secondary = 'Smartphones';
      analysis.category.tertiary = 'iPhone';

      const score = calculateCategoryConfidence(analysis);
      expect(score).toBeGreaterThan(65);
    });

    it('should boost confidence when category appears in extracted text', () => {
      const analysis = createMinimalAnalysis();
      analysis.extractedText = [
        { text: 'Electronics', confidence: ConfidenceLevel.HIGH },
      ];

      const score = calculateCategoryConfidence(analysis);
      expect(score).toBeGreaterThan(60);
    });
  });

  describe('calculateBrandConfidence', () => {
    it('should return 0 if no brand identified', () => {
      const analysis = createMinimalAnalysis();
      analysis.brand = undefined;

      const score = calculateBrandConfidence(analysis);
      expect(score).toBe(0);
    });

    it('should boost confidence for verified brand', () => {
      const analysis = createMinimalAnalysis();
      analysis.brand = {
        name: 'Apple',
        confidence: ConfidenceLevel.MEDIUM,
        verified: true,
      };

      const score = calculateBrandConfidence(analysis);
      expect(score).toBeGreaterThan(60);
    });

    it('should boost confidence when brand appears in text', () => {
      const analysis = createMinimalAnalysis();
      analysis.brand = {
        name: 'Apple',
        confidence: ConfidenceLevel.MEDIUM,
        verified: false,
      };
      analysis.extractedText = [
        { text: 'Apple', confidence: ConfidenceLevel.HIGH },
      ];

      const score = calculateBrandConfidence(analysis);
      expect(score).toBeGreaterThan(60);
    });
  });

  describe('calculateConditionConfidence', () => {
    it('should reduce confidence for unknown condition', () => {
      const analysis = createMinimalAnalysis();
      analysis.condition = ProductCondition.UNKNOWN;

      const score = calculateConditionConfidence(analysis);
      expect(score).toBeLessThanOrEqual(20);
    });

    it('should boost confidence for excellent image quality', () => {
      const analysis = createMinimalAnalysis();
      analysis.visualQuality.imageQuality = 'excellent';

      const score = calculateConditionConfidence(analysis);
      expect(score).toBeGreaterThan(60);
    });

    it('should reduce confidence for poor image quality', () => {
      const analysis = createMinimalAnalysis();
      analysis.visualQuality.imageQuality = 'poor';

      const score = calculateConditionConfidence(analysis);
      expect(score).toBeLessThan(60);
    });

    it('should boost confidence for sharp clarity', () => {
      const analysis = createMinimalAnalysis();
      analysis.visualQuality.clarity = 'sharp';

      const score = calculateConditionConfidence(analysis);
      expect(score).toBeGreaterThan(60);
    });
  });

  describe('calculateAttributesConfidence', () => {
    it('should increase confidence with more attributes', () => {
      const baseAnalysis = createMinimalAnalysis();
      const baseScore = calculateAttributesConfidence(baseAnalysis);

      const enrichedAnalysis = createMinimalAnalysis();
      enrichedAnalysis.attributes = {
        color: ['Red'],
        material: ['Metal'],
        size: 'Large',
        model: 'X123',
      };

      const enrichedScore = calculateAttributesConfidence(enrichedAnalysis);
      expect(enrichedScore).toBeGreaterThan(baseScore);
    });

    it('should boost confidence with extracted text', () => {
      const analysis = createMinimalAnalysis();
      analysis.extractedText = [
        { text: 'Model: X123', confidence: ConfidenceLevel.HIGH },
      ];

      const score = calculateAttributesConfidence(analysis);
      expect(score).toBeGreaterThan(50);
    });
  });

  describe('calculateVisualQualityConfidence', () => {
    it('should give high score for excellent quality', () => {
      const analysis = createMinimalAnalysis();
      analysis.visualQuality = {
        imageQuality: 'excellent',
        lighting: 'good',
        clarity: 'sharp',
        background: 'clean',
      };

      const score = calculateVisualQualityConfidence(analysis);
      expect(score).toBeGreaterThan(80);
    });

    it('should give low score for poor quality', () => {
      const analysis = createMinimalAnalysis();
      analysis.visualQuality = {
        imageQuality: 'poor',
        lighting: 'poor',
        clarity: 'blurry',
        background: 'distracting',
      };

      const score = calculateVisualQualityConfidence(analysis);
      expect(score).toBeLessThan(40);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should return a score between 0 and 100', () => {
      const analysis = createMinimalAnalysis();
      const score = calculateOverallConfidence(analysis);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher score for high quality analysis', () => {
      const analysis = createMinimalAnalysis();
      analysis.category.confidence = ConfidenceLevel.HIGH;
      analysis.conditionConfidence = ConfidenceLevel.HIGH;
      analysis.brand = {
        name: 'Apple',
        confidence: ConfidenceLevel.HIGH,
        verified: true,
      };
      analysis.visualQuality = {
        imageQuality: 'excellent',
        lighting: 'good',
        clarity: 'sharp',
        background: 'clean',
      };

      const score = calculateOverallConfidence(analysis);
      expect(score).toBeGreaterThan(70);
    });
  });

  describe('getConfidenceBreakdown', () => {
    it('should return confidence scores for all attributes', () => {
      const analysis = createMinimalAnalysis();
      const breakdown = getConfidenceBreakdown(analysis);

      expect(breakdown).toHaveProperty('productType');
      expect(breakdown).toHaveProperty('category');
      expect(breakdown).toHaveProperty('brand');
      expect(breakdown).toHaveProperty('condition');
      expect(breakdown).toHaveProperty('attributes');
      expect(breakdown).toHaveProperty('visualQuality');
      expect(breakdown).toHaveProperty('overall');

      // All scores should be between 0 and 100
      Object.values(breakdown).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('getConfidenceRecommendations', () => {
    it('should recommend better images for poor visual quality', () => {
      const analysis = createMinimalAnalysis();
      analysis.visualQuality = {
        imageQuality: 'poor',
        lighting: 'poor',
        clarity: 'blurry',
        background: 'distracting',
      };

      const recommendations = getConfidenceRecommendations(analysis);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(
        recommendations.some((r) => r.toLowerCase().includes('image'))
      ).toBe(true);
    });

    it('should recommend manual input for low confidence', () => {
      const analysis = createMinimalAnalysis();
      analysis.category.confidence = ConfidenceLevel.LOW;
      analysis.conditionConfidence = ConfidenceLevel.LOW;
      analysis.overallConfidence = ConfidenceLevel.LOW;

      const recommendations = getConfidenceRecommendations(analysis);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should include AI recommendations if available', () => {
      const analysis = createMinimalAnalysis();
      analysis.visualQuality.recommendations = [
        'Use better lighting',
        'Clean background',
      ];

      const recommendations = getConfidenceRecommendations(analysis);
      expect(recommendations).toContain('Use better lighting');
      expect(recommendations).toContain('Clean background');
    });
  });
});
