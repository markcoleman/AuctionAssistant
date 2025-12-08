/**
 * Tests for Product Enrichment Service
 */

import {
  ProductEnrichmentService,
  createProductEnrichmentService,
  ProductDatabaseEntry,
} from '../src/services/productEnrichment';
import {
  ProductAnalysis,
  ProductCondition,
  ConfidenceLevel,
} from '../src/types/productAnalysis';

describe('Product Enrichment Service', () => {
  let service: ProductEnrichmentService;

  // Helper to create a minimal product analysis
  const createMinimalAnalysis = (): ProductAnalysis => ({
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
      model: 'A2483',
    },
    extractedText: [
      {
        text: 'iPhone 13 Pro',
        location: 'product',
        confidence: ConfidenceLevel.HIGH,
      },
      { text: 'Apple', location: 'logo', confidence: ConfidenceLevel.HIGH },
    ],
    features: ['5G', 'Dual Camera', 'Face ID'],
    visualQuality: {
      imageQuality: 'excellent',
      lighting: 'good',
      clarity: 'sharp',
      background: 'clean',
    },
    description:
      'Apple iPhone 13 Pro in excellent condition with minimal signs of use.',
    suggestedTitle: 'Apple iPhone 13 Pro - Graphite - Excellent Condition',
    suggestedKeywords: ['iPhone', 'Apple', '5G', 'smartphone'],
    overallConfidence: ConfidenceLevel.HIGH,
    analysisTimestamp: new Date(),
  });

  beforeEach(() => {
    service = createProductEnrichmentService();
  });

  describe('enrichProductAnalysis', () => {
    it('should enrich product analysis with confidence scores', async () => {
      const analysis = createMinimalAnalysis();
      const enriched = await service.enrichProductAnalysis(analysis);

      expect(enriched.enrichmentData).toBeDefined();
      expect(enriched.enrichmentData.confidenceScores).toBeDefined();
      expect(enriched.enrichmentData.confidenceScores.overall).toBeGreaterThan(
        0
      );
      expect(
        enriched.enrichmentData.confidenceScores.overall
      ).toBeLessThanOrEqual(100);
    });

    it('should include recommendations', async () => {
      const analysis = createMinimalAnalysis();
      const enriched = await service.enrichProductAnalysis(analysis);

      expect(enriched.enrichmentData.recommendations).toBeDefined();
      expect(Array.isArray(enriched.enrichmentData.recommendations)).toBe(true);
    });

    it('should calculate completeness score', async () => {
      const analysis = createMinimalAnalysis();
      const enriched = await service.enrichProductAnalysis(analysis);

      expect(enriched.enrichmentData.completenessScore).toBeDefined();
      expect(enriched.enrichmentData.completenessScore).toBeGreaterThanOrEqual(
        0
      );
      expect(enriched.enrichmentData.completenessScore).toBeLessThanOrEqual(
        100
      );
    });

    it('should identify missing critical info', async () => {
      const analysis = createMinimalAnalysis();
      analysis.productType = 'Unknown Product';
      analysis.condition = ProductCondition.UNKNOWN;

      const enriched = await service.enrichProductAnalysis(analysis);

      expect(enriched.enrichmentData.missingCriticalInfo).toBeDefined();
      expect(
        enriched.enrichmentData.missingCriticalInfo.length
      ).toBeGreaterThan(0);
    });

    it('should perform sentiment analysis when enabled', async () => {
      const analysis = createMinimalAnalysis();
      const enriched = await service.enrichProductAnalysis(analysis, {
        enableSentimentAnalysis: true,
      });

      expect(enriched.enrichmentData.sentimentScore).toBeDefined();
      expect(enriched.enrichmentData.sentimentScore).toBeGreaterThanOrEqual(-1);
      expect(enriched.enrichmentData.sentimentScore).toBeLessThanOrEqual(1);
    });

    it('should skip sentiment analysis when disabled', async () => {
      const analysis = createMinimalAnalysis();
      const enriched = await service.enrichProductAnalysis(analysis, {
        enableSentimentAnalysis: false,
      });

      expect(enriched.enrichmentData.sentimentScore).toBeUndefined();
    });

    it('should check database for matches when enabled', async () => {
      const analysis = createMinimalAnalysis();

      // Add a product to cache first
      const dbEntry: ProductDatabaseEntry = {
        upc: '123456789012',
        productName: 'iPhone 13 Pro',
        brand: 'Apple',
        category: 'Electronics',
        model: 'A2483',
        lastUpdated: new Date(),
      };
      service.addProductToCache(dbEntry);

      const enriched = await service.enrichProductAnalysis(analysis, {
        enableDatabaseLookup: true,
      });

      // Database match should be found
      expect(enriched.enrichmentData.databaseMatch).toBeDefined();
    });
  });

  describe('addProductToCache', () => {
    it('should cache product by UPC', () => {
      const entry: ProductDatabaseEntry = {
        upc: '123456789012',
        productName: 'iPhone 13 Pro',
        brand: 'Apple',
        category: 'Electronics',
        lastUpdated: new Date(),
      };

      service.addProductToCache(entry);
      const cached = service.getCachedProducts();

      expect(cached.length).toBeGreaterThan(0);
      expect(cached[0].upc).toBe('123456789012');
    });

    it('should cache product by EAN', () => {
      const entry: ProductDatabaseEntry = {
        ean: '1234567890123',
        productName: 'Samsung Galaxy',
        brand: 'Samsung',
        category: 'Electronics',
        lastUpdated: new Date(),
      };

      service.addProductToCache(entry);
      const cached = service.getCachedProducts();

      expect(cached.some((p) => p.ean === '1234567890123')).toBe(true);
    });

    it('should cache product by brand and model', () => {
      const entry: ProductDatabaseEntry = {
        productName: 'MacBook Pro',
        brand: 'Apple',
        category: 'Computers',
        model: 'M1-14',
        lastUpdated: new Date(),
      };

      service.addProductToCache(entry);
      const cached = service.getCachedProducts();

      expect(
        cached.some((p) => p.brand === 'Apple' && p.model === 'M1-14')
      ).toBe(true);
    });
  });

  describe('validateEnrichedProduct', () => {
    it('should validate product with high confidence', async () => {
      const analysis = createMinimalAnalysis();
      const enriched = await service.enrichProductAnalysis(analysis);

      const validation = service.validateEnrichedProduct(enriched, 50);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should fail validation for low confidence', async () => {
      const analysis = createMinimalAnalysis();
      analysis.category.confidence = ConfidenceLevel.LOW;
      analysis.conditionConfidence = ConfidenceLevel.LOW;
      analysis.overallConfidence = ConfidenceLevel.LOW;

      const enriched = await service.enrichProductAnalysis(analysis);
      const validation = service.validateEnrichedProduct(enriched, 70);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for unknown condition', async () => {
      const analysis = createMinimalAnalysis();
      analysis.condition = ProductCondition.UNKNOWN;

      const enriched = await service.enrichProductAnalysis(analysis);
      const validation = service.validateEnrichedProduct(enriched);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('condition'))).toBe(true);
    });

    it('should include warnings for incomplete data', async () => {
      const analysis: ProductAnalysis = {
        ...createMinimalAnalysis(),
        brand: undefined,
        attributes: {},
      };

      const enriched = await service.enrichProductAnalysis(analysis);
      const validation = service.validateEnrichedProduct(enriched);

      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('mergeWithDatabaseEntry', () => {
    it('should merge database entry with analysis', () => {
      const analysis = createMinimalAnalysis();
      const dbEntry: ProductDatabaseEntry = {
        upc: '123456789012',
        productName: 'iPhone 13 Pro 256GB',
        brand: 'Apple',
        category: 'Electronics',
        model: 'A2483',
        attributes: { storage: '256GB' },
        lastUpdated: new Date(),
      };

      const merged = service.mergeWithDatabaseEntry(analysis, dbEntry);

      expect(merged.productType).toBe('iPhone 13 Pro 256GB');
      expect(merged.brand?.name).toBe('Apple');
      expect(merged.brand?.verified).toBe(true);
      expect(merged.attributes.customAttributes?.storage).toBe('256GB');
    });

    it('should increase confidence with database match', () => {
      const analysis = createMinimalAnalysis();
      analysis.category.confidence = ConfidenceLevel.LOW;

      const dbEntry: ProductDatabaseEntry = {
        productName: 'iPhone 13 Pro',
        brand: 'Apple',
        category: 'Electronics',
        model: 'A2483',
        lastUpdated: new Date(),
      };

      const merged = service.mergeWithDatabaseEntry(analysis, dbEntry);

      expect(merged.overallConfidence).toBe(ConfidenceLevel.HIGH);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached products', () => {
      const entry: ProductDatabaseEntry = {
        upc: '123456789012',
        productName: 'Test Product',
        brand: 'Test Brand',
        category: 'Test',
        lastUpdated: new Date(),
      };

      service.addProductToCache(entry);
      expect(service.getCachedProducts().length).toBeGreaterThan(0);

      service.clearCache();
      expect(service.getCachedProducts().length).toBe(0);
    });
  });

  describe('sentiment analysis', () => {
    it('should return positive sentiment for new condition', async () => {
      const analysis = createMinimalAnalysis();
      analysis.condition = ProductCondition.NEW;
      analysis.description = 'Brand new, perfect condition, never used';

      const enriched = await service.enrichProductAnalysis(analysis, {
        enableSentimentAnalysis: true,
      });

      expect(enriched.enrichmentData.sentimentScore).toBeGreaterThan(0.5);
    });

    it('should return negative sentiment for poor condition', async () => {
      const analysis = createMinimalAnalysis();
      analysis.condition = ProductCondition.POOR;
      analysis.description = 'Broken screen, scratches, missing parts';
      analysis.defects = {
        scratches: true,
        dents: true,
        missingParts: true,
        severity: 'severe',
      };

      const enriched = await service.enrichProductAnalysis(analysis, {
        enableSentimentAnalysis: true,
      });

      expect(enriched.enrichmentData.sentimentScore).toBeLessThan(0);
    });

    it('should return neutral sentiment for fair condition', async () => {
      const analysis = createMinimalAnalysis();
      analysis.condition = ProductCondition.FAIR;
      analysis.description = 'Used condition with normal wear';

      const enriched = await service.enrichProductAnalysis(analysis, {
        enableSentimentAnalysis: true,
      });

      expect(enriched.enrichmentData.sentimentScore).toBeGreaterThanOrEqual(-1);
      expect(enriched.enrichmentData.sentimentScore).toBeLessThanOrEqual(1);
    });
  });

  describe('completeness checking', () => {
    it('should give high completeness score for complete data', async () => {
      const analysis = createMinimalAnalysis();
      const enriched = await service.enrichProductAnalysis(analysis, {
        enableCompletenessCheck: true,
      });

      expect(enriched.enrichmentData.completenessScore).toBeGreaterThan(70);
    });

    it('should give low completeness score for minimal data', async () => {
      const analysis: ProductAnalysis = {
        productType: 'Unknown Product',
        category: { primary: 'Unknown', confidence: ConfidenceLevel.LOW },
        condition: ProductCondition.UNKNOWN,
        conditionConfidence: ConfidenceLevel.LOW,
        attributes: {},
        extractedText: [],
        features: [],
        visualQuality: {
          imageQuality: 'poor',
          lighting: 'poor',
          clarity: 'blurry',
          background: 'cluttered',
        },
        description: '',
        suggestedTitle: '',
        suggestedKeywords: [],
        overallConfidence: ConfidenceLevel.LOW,
        analysisTimestamp: new Date(),
      };

      const enriched = await service.enrichProductAnalysis(analysis, {
        enableCompletenessCheck: true,
      });

      expect(enriched.enrichmentData.completenessScore).toBeLessThan(50);
      expect(
        enriched.enrichmentData.missingCriticalInfo.length
      ).toBeGreaterThan(0);
    });
  });
});
