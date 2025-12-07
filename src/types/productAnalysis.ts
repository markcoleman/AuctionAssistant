/**
 * Product Analysis Types
 * TypeScript interfaces for AI vision analysis results
 */

/**
 * Product condition assessment
 */
export enum ProductCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  FOR_PARTS = 'for_parts',
  UNKNOWN = 'unknown',
}

/**
 * Confidence level for AI predictions
 */
export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Product category
 */
export interface ProductCategory {
  primary: string; // e.g., "Electronics", "Furniture", "Clothing"
  secondary?: string; // e.g., "Smartphones", "Chairs", "Men's Shoes"
  tertiary?: string; // e.g., "iPhone", "Office Chair", "Sneakers"
  confidence: ConfidenceLevel;
}

/**
 * Brand identification
 */
export interface BrandIdentification {
  name: string;
  confidence: ConfidenceLevel;
  verified: boolean; // Whether brand was verified through logo/text recognition
}

/**
 * Product features and attributes
 */
export interface ProductAttributes {
  color?: string[];
  material?: string[];
  size?: string;
  style?: string;
  model?: string;
  year?: string;
  dimensions?: {
    width?: string;
    height?: string;
    depth?: string;
  };
  weight?: string;
  customAttributes?: Record<string, string>; // Category-specific attributes
}

/**
 * Text extracted from image via OCR
 */
export interface ExtractedText {
  text: string;
  location?: string; // e.g., "label", "tag", "packaging", "product"
  confidence: ConfidenceLevel;
}

/**
 * Visual quality assessment
 */
export interface VisualQuality {
  imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lighting: 'good' | 'fair' | 'poor';
  clarity: 'sharp' | 'slightly_blurry' | 'blurry';
  background: 'clean' | 'cluttered' | 'distracting';
  recommendations?: string[]; // Suggestions for better photos
}

/**
 * Detected defects or damage
 */
export interface DetectedDefects {
  scratches?: boolean;
  dents?: boolean;
  stains?: boolean;
  tears?: boolean;
  missingParts?: boolean;
  wear?: boolean;
  description?: string;
  severity?: 'minor' | 'moderate' | 'severe';
}

/**
 * Complete product analysis result
 */
export interface ProductAnalysis {
  // Core identification
  productType: string; // General description, e.g., "Apple iPhone 13 Pro"
  category: ProductCategory;
  brand?: BrandIdentification;
  condition: ProductCondition;
  conditionConfidence: ConfidenceLevel;

  // Detailed information
  attributes: ProductAttributes;
  extractedText: ExtractedText[];
  features: string[]; // List of notable features, e.g., ["64GB storage", "5G capable", "Dual camera"]
  defects?: DetectedDefects;

  // Visual analysis
  visualQuality: VisualQuality;

  // AI metadata
  description: string; // Natural language description of the product
  suggestedTitle: string; // Suggested listing title (50-80 chars)
  suggestedKeywords: string[]; // SEO keywords
  overallConfidence: ConfidenceLevel;
  analysisTimestamp: Date;
}

/**
 * Options for AI vision analysis
 */
export interface AnalysisOptions {
  includeOCR?: boolean; // Enable text extraction
  detailedAnalysis?: boolean; // More thorough analysis (slower, more expensive)
  generateTitle?: boolean; // Generate suggested listing title
  generateKeywords?: boolean; // Generate SEO keywords
  maxTokens?: number; // Limit AI response tokens
}

/**
 * Error information for failed analysis
 */
export interface AnalysisError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}

/**
 * Analysis result wrapper with error handling
 */
export interface AnalysisResult {
  success: boolean;
  data?: ProductAnalysis;
  error?: AnalysisError;
  tokensUsed?: number; // For cost tracking
}

/**
 * User-provided details for product listing
 * Optional fields that users can provide to enhance or override AI analysis
 */
export interface UserProvidedDetails {
  // Basic information
  condition?: ProductCondition;
  brand?: string;
  model?: string;
  productType?: string;
  description?: string;

  // Attributes
  color?: string[];
  material?: string[];
  size?: string;
  year?: string;

  // Category-specific details
  categorySpecificDetails?: Record<string, string>;

  // Additional context
  notes?: string; // Internal notes not for listing
  customTitle?: string; // User's preferred title
  customKeywords?: string[]; // Additional keywords
}

/**
 * Merged product data combining AI analysis and user inputs
 * User-provided data takes precedence over AI predictions
 */
export interface MergedProductData extends ProductAnalysis {
  // Track data sources
  dataSources: {
    productType: 'ai' | 'user' | 'merged';
    brand: 'ai' | 'user' | 'merged';
    condition: 'ai' | 'user' | 'merged';
    attributes: 'ai' | 'user' | 'merged';
    description: 'ai' | 'user' | 'merged';
    title: 'ai' | 'user' | 'merged';
  };

  // User inputs (preserved separately)
  userProvidedDetails?: UserProvidedDetails;

  // Validation status
  validationStatus: {
    isComplete: boolean; // All required fields present
    missingFields: string[]; // List of missing required fields
    warnings: string[]; // Non-critical issues
  };
}
