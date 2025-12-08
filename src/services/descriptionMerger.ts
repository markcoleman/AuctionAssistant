/**
 * Description Merger Service
 * Combines AI-generated product analysis with user-provided details
 * User inputs take precedence over AI predictions when provided
 */

import {
  ProductAnalysis,
  UserProvidedDetails,
  MergedProductData,
  ProductCondition,
  ConfidenceLevel,
} from '../types/productAnalysis';

/**
 * Merge options for controlling how data is combined
 */
export interface MergeOptions {
  prioritizeUser?: boolean; // Default: true - user data overrides AI
  validateCompleteness?: boolean; // Default: true - check for required fields
  enhanceDescription?: boolean; // Default: true - combine descriptions
}

/**
 * Merge AI analysis with user-provided details
 * @param aiAnalysis - AI-generated product analysis
 * @param userDetails - User-provided product details
 * @param options - Merge options
 * @returns Merged product data
 */
export function mergeProductData(
  aiAnalysis: ProductAnalysis,
  userDetails: UserProvidedDetails = {},
  options: MergeOptions = {}
): MergedProductData {
  const {
    prioritizeUser = true,
    validateCompleteness = true,
    enhanceDescription = true,
  } = options;

  // Initialize data sources tracker
  const dataSources: MergedProductData['dataSources'] = {
    productType: 'ai',
    brand: 'ai',
    condition: 'ai',
    attributes: 'ai',
    description: 'ai',
    title: 'ai',
  };

  // Merge product type
  const productType =
    prioritizeUser && userDetails.productType
      ? userDetails.productType
      : aiAnalysis.productType;
  if (userDetails.productType) {
    dataSources.productType = prioritizeUser ? 'user' : 'merged';
  }

  // Merge brand information
  let brand = aiAnalysis.brand;
  if (prioritizeUser && userDetails.brand) {
    brand = {
      name: userDetails.brand,
      confidence: ConfidenceLevel.HIGH, // User-provided is high confidence
      verified: true,
    };
    dataSources.brand = 'user';
  } else if (!prioritizeUser && userDetails.brand && aiAnalysis.brand) {
    // Merge: prefer AI brand if confidence is higher, otherwise use user
    brand = {
      name: userDetails.brand,
      confidence: ConfidenceLevel.HIGH,
      verified: true,
    };
    dataSources.brand = 'merged';
  }

  // Merge condition
  const condition =
    prioritizeUser && userDetails.condition
      ? userDetails.condition
      : aiAnalysis.condition;
  const conditionConfidence =
    prioritizeUser && userDetails.condition
      ? ConfidenceLevel.HIGH
      : aiAnalysis.conditionConfidence;
  if (userDetails.condition) {
    dataSources.condition = prioritizeUser ? 'user' : 'merged';
  }

  // Merge attributes
  const attributes = {
    ...aiAnalysis.attributes,
  };

  // Merge user-provided attributes with AI attributes
  if (userDetails.color && userDetails.color.length > 0) {
    attributes.color = userDetails.color;
    dataSources.attributes = 'merged';
  }
  if (userDetails.material && userDetails.material.length > 0) {
    attributes.material = userDetails.material;
    dataSources.attributes = 'merged';
  }
  if (userDetails.size) {
    attributes.size = userDetails.size;
    dataSources.attributes = 'merged';
  }
  if (userDetails.year) {
    attributes.year = userDetails.year;
    dataSources.attributes = 'merged';
  }
  if (userDetails.model) {
    attributes.model = userDetails.model;
    dataSources.attributes = 'merged';
  }

  // Merge category-specific attributes
  if (userDetails.categorySpecificDetails) {
    attributes.customAttributes = {
      ...(attributes.customAttributes || {}),
      ...userDetails.categorySpecificDetails,
    };
    dataSources.attributes = 'merged';
  }

  // Merge description
  let description = aiAnalysis.description;
  if (prioritizeUser && userDetails.description) {
    description = userDetails.description;
    dataSources.description = 'user';
  } else if (enhanceDescription && userDetails.description) {
    // Combine AI and user descriptions
    description = `${userDetails.description}\n\n${aiAnalysis.description}`;
    dataSources.description = 'merged';
  }

  // Merge title
  let suggestedTitle = aiAnalysis.suggestedTitle;
  if (prioritizeUser && userDetails.customTitle) {
    suggestedTitle = userDetails.customTitle;
    dataSources.title = 'user';
  } else if (
    !prioritizeUser &&
    userDetails.customTitle &&
    aiAnalysis.suggestedTitle
  ) {
    dataSources.title = 'merged';
  }

  // Merge keywords
  const suggestedKeywords = [
    ...aiAnalysis.suggestedKeywords,
    ...(userDetails.customKeywords || []),
  ];

  // Create merged data
  const mergedData: MergedProductData = {
    ...aiAnalysis,
    productType,
    brand,
    condition,
    conditionConfidence,
    attributes,
    description,
    suggestedTitle,
    suggestedKeywords: [...new Set(suggestedKeywords)], // Remove duplicates
    dataSources,
    userProvidedDetails: userDetails,
    validationStatus: {
      isComplete: false,
      missingFields: [],
      warnings: [],
    },
  };

  // Validate completeness if requested
  if (validateCompleteness) {
    mergedData.validationStatus = validateProductData(mergedData);
  }

  return mergedData;
}

/**
 * Validate product data for completeness
 * @param data - Product data to validate
 * @returns Validation status
 */
export function validateProductData(
  data: ProductAnalysis | MergedProductData
): MergedProductData['validationStatus'] {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!data.productType || data.productType === 'Unknown Product') {
    missingFields.push('productType');
  }
  if (!data.condition || data.condition === ProductCondition.UNKNOWN) {
    missingFields.push('condition');
  }
  if (!data.category || data.category.primary === 'Unknown') {
    missingFields.push('category');
  }

  // Check for low confidence predictions
  if (data.overallConfidence === ConfidenceLevel.LOW) {
    warnings.push('Overall AI confidence is low - consider reviewing results');
  }
  if (data.conditionConfidence === ConfidenceLevel.LOW) {
    warnings.push('Condition assessment confidence is low');
  }
  if (data.category.confidence === ConfidenceLevel.LOW) {
    warnings.push('Category classification confidence is low');
  }

  // Check for important optional fields
  if (!data.brand) {
    warnings.push('Brand not identified - consider adding manually');
  }
  if (
    !data.attributes.color ||
    (Array.isArray(data.attributes.color) && data.attributes.color.length === 0)
  ) {
    warnings.push('Color not identified');
  }

  // Check visual quality
  if (data.visualQuality.imageQuality === 'poor') {
    warnings.push('Image quality is poor - consider uploading better photos');
  }
  if (
    data.visualQuality.background === 'cluttered' ||
    data.visualQuality.background === 'distracting'
  ) {
    warnings.push(
      'Background is distracting - cleaner photos may improve analysis'
    );
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Validate user-provided details
 * @param details - User-provided details to validate
 * @returns Validation result with errors
 */
export function validateUserInput(details: UserProvidedDetails): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate condition enum
  if (details.condition) {
    const validConditions = Object.values(ProductCondition);
    if (!validConditions.includes(details.condition)) {
      errors.push(
        `Invalid condition value. Must be one of: ${validConditions.join(', ')}`
      );
    }
  }

  // Validate string lengths
  if (details.brand && details.brand.length > 100) {
    errors.push('Brand name must be 100 characters or less');
  }
  if (details.model && details.model.length > 100) {
    errors.push('Model must be 100 characters or less');
  }
  if (details.productType && details.productType.length > 200) {
    errors.push('Product type must be 200 characters or less');
  }
  if (details.description && details.description.length > 5000) {
    errors.push('Description must be 5000 characters or less');
  }
  if (details.customTitle && details.customTitle.length > 200) {
    errors.push('Custom title must be 200 characters or less');
  }

  // Validate year if provided
  if (details.year) {
    const yearNum = parseInt(details.year, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(yearNum) || yearNum < 1800 || yearNum > currentYear + 1) {
      errors.push(`Invalid year. Must be between 1800 and ${currentYear + 1}`);
    }
  }

  // Validate arrays
  if (details.color && details.color.length > 10) {
    errors.push('Maximum 10 colors allowed');
  }
  if (details.material && details.material.length > 10) {
    errors.push('Maximum 10 materials allowed');
  }
  if (details.customKeywords && details.customKeywords.length > 20) {
    errors.push('Maximum 20 custom keywords allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
