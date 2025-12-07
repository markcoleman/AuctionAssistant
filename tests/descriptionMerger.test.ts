/**
 * Tests for Description Merger Service
 */

import {
  mergeProductData,
  validateProductData,
  validateUserInput,
} from '../src/services/descriptionMerger';
import {
  ProductAnalysis,
  ProductCondition,
  ConfidenceLevel,
  UserProvidedDetails,
} from '../src/types/productAnalysis';

describe('Description Merger Service', () => {
  // Sample AI analysis data
  const sampleAIAnalysis: ProductAnalysis = {
    productType: 'Apple iPhone 13',
    category: {
      primary: 'Electronics',
      secondary: 'Smartphones',
      tertiary: 'iPhone',
      confidence: ConfidenceLevel.HIGH,
    },
    brand: {
      name: 'Apple',
      confidence: ConfidenceLevel.HIGH,
      verified: true,
    },
    condition: ProductCondition.GOOD,
    conditionConfidence: ConfidenceLevel.MEDIUM,
    attributes: {
      color: ['Blue'],
      model: 'iPhone 13',
      size: '6.1 inches',
    },
    extractedText: [
      {
        text: 'iPhone',
        location: 'product',
        confidence: ConfidenceLevel.HIGH,
      },
    ],
    features: ['5G capable', 'Dual camera', '128GB storage'],
    visualQuality: {
      imageQuality: 'good',
      lighting: 'good',
      clarity: 'sharp',
      background: 'clean',
    },
    description: 'Apple iPhone 13 in blue color with dual camera system.',
    suggestedTitle: 'Apple iPhone 13 - Blue, 128GB',
    suggestedKeywords: ['iPhone', 'Apple', 'smartphone', '5G'],
    overallConfidence: ConfidenceLevel.HIGH,
    analysisTimestamp: new Date(),
  };

  describe('mergeProductData', () => {
    it('should return AI data when no user details provided', () => {
      const merged = mergeProductData(sampleAIAnalysis, {});

      expect(merged.productType).toBe(sampleAIAnalysis.productType);
      expect(merged.condition).toBe(sampleAIAnalysis.condition);
      expect(merged.brand?.name).toBe(sampleAIAnalysis.brand?.name);
      expect(merged.dataSources.productType).toBe('ai');
      expect(merged.dataSources.brand).toBe('ai');
      expect(merged.dataSources.condition).toBe('ai');
    });

    it('should prioritize user-provided product type', () => {
      const userDetails: UserProvidedDetails = {
        productType: 'iPhone 13 Pro Max',
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.productType).toBe('iPhone 13 Pro Max');
      expect(merged.dataSources.productType).toBe('user');
    });

    it('should prioritize user-provided condition', () => {
      const userDetails: UserProvidedDetails = {
        condition: ProductCondition.EXCELLENT,
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.condition).toBe(ProductCondition.EXCELLENT);
      expect(merged.conditionConfidence).toBe(ConfidenceLevel.HIGH);
      expect(merged.dataSources.condition).toBe('user');
    });

    it('should prioritize user-provided brand', () => {
      const userDetails: UserProvidedDetails = {
        brand: 'Samsung',
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.brand?.name).toBe('Samsung');
      expect(merged.brand?.confidence).toBe(ConfidenceLevel.HIGH);
      expect(merged.brand?.verified).toBe(true);
      expect(merged.dataSources.brand).toBe('user');
    });

    it('should merge color attributes', () => {
      const userDetails: UserProvidedDetails = {
        color: ['Black', 'Silver'],
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.attributes.color).toEqual(['Black', 'Silver']);
      expect(merged.dataSources.attributes).toBe('merged');
    });

    it('should merge material attributes', () => {
      const userDetails: UserProvidedDetails = {
        material: ['Aluminum', 'Glass'],
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.attributes.material).toEqual(['Aluminum', 'Glass']);
      expect(merged.dataSources.attributes).toBe('merged');
    });

    it('should merge size, year, and model', () => {
      const userDetails: UserProvidedDetails = {
        size: 'Large',
        year: '2021',
        model: 'A2482',
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.attributes.size).toBe('Large');
      expect(merged.attributes.year).toBe('2021');
      expect(merged.attributes.model).toBe('A2482');
      expect(merged.dataSources.attributes).toBe('merged');
    });

    it('should merge category-specific details', () => {
      const userDetails: UserProvidedDetails = {
        categorySpecificDetails: {
          screenSize: '6.1 inches',
          batteryCapacity: '3095 mAh',
        },
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.attributes.customAttributes).toHaveProperty('screenSize');
      expect(merged.attributes.customAttributes?.screenSize).toBe('6.1 inches');
      expect(merged.attributes.customAttributes).toHaveProperty(
        'batteryCapacity'
      );
      expect(merged.dataSources.attributes).toBe('merged');
    });

    it('should prioritize user description', () => {
      const userDetails: UserProvidedDetails = {
        description: 'Excellent condition iPhone, barely used!',
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.description).toBe(
        'Excellent condition iPhone, barely used!'
      );
      expect(merged.dataSources.description).toBe('user');
    });

    it('should enhance description when option is enabled', () => {
      const userDetails: UserProvidedDetails = {
        description: 'User provided description.',
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails, {
        prioritizeUser: false,
        enhanceDescription: true,
      });

      expect(merged.description).toContain('User provided description.');
      expect(merged.description).toContain(sampleAIAnalysis.description);
      expect(merged.dataSources.description).toBe('merged');
    });

    it('should use custom title when provided', () => {
      const userDetails: UserProvidedDetails = {
        customTitle: 'Amazing iPhone Deal!',
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.suggestedTitle).toBe('Amazing iPhone Deal!');
      expect(merged.dataSources.title).toBe('user');
    });

    it('should merge keywords without duplicates', () => {
      const userDetails: UserProvidedDetails = {
        customKeywords: ['smartphone', 'mobile', 'iOS'],
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.suggestedKeywords).toContain('smartphone');
      expect(merged.suggestedKeywords).toContain('mobile');
      expect(merged.suggestedKeywords).toContain('iOS');
      expect(merged.suggestedKeywords).toContain('iPhone');
      // Check no duplicates
      expect(
        merged.suggestedKeywords.filter((k) => k === 'smartphone').length
      ).toBe(1);
    });

    it('should preserve user-provided details', () => {
      const userDetails: UserProvidedDetails = {
        brand: 'Apple',
        model: 'A2482',
        notes: 'Internal note',
      };

      const merged = mergeProductData(sampleAIAnalysis, userDetails);

      expect(merged.userProvidedDetails).toEqual(userDetails);
    });

    it('should validate completeness when option is enabled', () => {
      const merged = mergeProductData(
        sampleAIAnalysis,
        {},
        {
          validateCompleteness: true,
        }
      );

      expect(merged.validationStatus).toBeDefined();
      expect(merged.validationStatus.isComplete).toBe(true);
      expect(merged.validationStatus.missingFields).toHaveLength(0);
    });
  });

  describe('validateProductData', () => {
    it('should mark complete data as valid', () => {
      const validation = validateProductData(sampleAIAnalysis);

      expect(validation.isComplete).toBe(true);
      expect(validation.missingFields).toHaveLength(0);
    });

    it('should detect missing product type', () => {
      const incompleteData: ProductAnalysis = {
        ...sampleAIAnalysis,
        productType: 'Unknown Product',
      };

      const validation = validateProductData(incompleteData);

      expect(validation.isComplete).toBe(false);
      expect(validation.missingFields).toContain('productType');
    });

    it('should detect unknown condition', () => {
      const incompleteData: ProductAnalysis = {
        ...sampleAIAnalysis,
        condition: ProductCondition.UNKNOWN,
      };

      const validation = validateProductData(incompleteData);

      expect(validation.isComplete).toBe(false);
      expect(validation.missingFields).toContain('condition');
    });

    it('should detect unknown category', () => {
      const incompleteData: ProductAnalysis = {
        ...sampleAIAnalysis,
        category: {
          primary: 'Unknown',
          confidence: ConfidenceLevel.LOW,
        },
      };

      const validation = validateProductData(incompleteData);

      expect(validation.isComplete).toBe(false);
      expect(validation.missingFields).toContain('category');
    });

    it('should warn about low confidence', () => {
      const lowConfidenceData: ProductAnalysis = {
        ...sampleAIAnalysis,
        overallConfidence: ConfidenceLevel.LOW,
      };

      const validation = validateProductData(lowConfidenceData);

      expect(validation.warnings).toContain(
        'Overall AI confidence is low - consider reviewing results'
      );
    });

    it('should warn about missing brand', () => {
      const noBrandData: ProductAnalysis = {
        ...sampleAIAnalysis,
        brand: undefined,
      };

      const validation = validateProductData(noBrandData);

      expect(validation.warnings).toContain(
        'Brand not identified - consider adding manually'
      );
    });

    it('should warn about poor image quality', () => {
      const poorQualityData: ProductAnalysis = {
        ...sampleAIAnalysis,
        visualQuality: {
          imageQuality: 'poor',
          lighting: 'poor',
          clarity: 'blurry',
          background: 'cluttered',
        },
      };

      const validation = validateProductData(poorQualityData);

      expect(validation.warnings).toContain(
        'Image quality is poor - consider uploading better photos'
      );
      expect(validation.warnings).toContain(
        'Background is distracting - cleaner photos may improve analysis'
      );
    });
  });

  describe('validateUserInput', () => {
    it('should validate correct user input', () => {
      const userDetails: UserProvidedDetails = {
        brand: 'Apple',
        model: 'iPhone 13',
        condition: ProductCondition.EXCELLENT,
        color: ['Blue'],
        year: '2021',
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid condition', () => {
      const userDetails = {
        condition: 'invalid_condition' as ProductCondition,
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Invalid condition value');
    });

    it('should reject brand name that is too long', () => {
      const userDetails: UserProvidedDetails = {
        brand: 'A'.repeat(101),
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Brand name must be 100 characters or less'
      );
    });

    it('should reject model that is too long', () => {
      const userDetails: UserProvidedDetails = {
        model: 'M'.repeat(101),
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Model must be 100 characters or less'
      );
    });

    it('should reject description that is too long', () => {
      const userDetails: UserProvidedDetails = {
        description: 'D'.repeat(5001),
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Description must be 5000 characters or less'
      );
    });

    it('should reject invalid year', () => {
      const userDetails: UserProvidedDetails = {
        year: '1700',
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Invalid year');
    });

    it('should reject future year', () => {
      const currentYear = new Date().getFullYear();
      const userDetails: UserProvidedDetails = {
        year: (currentYear + 5).toString(),
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Invalid year');
    });

    it('should reject too many colors', () => {
      const userDetails: UserProvidedDetails = {
        color: Array(11).fill('Color'),
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Maximum 10 colors allowed');
    });

    it('should reject too many keywords', () => {
      const userDetails: UserProvidedDetails = {
        customKeywords: Array(21).fill('keyword'),
      };

      const validation = validateUserInput(userDetails);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Maximum 20 custom keywords allowed');
    });
  });
});
