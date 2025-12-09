/**
 * Marketplace Prompts
 * AI prompt templates for generating engaging marketplace posts
 */

import { ProductAnalysis, ProductCondition } from '../types/productAnalysis';

/**
 * Marketplace tone styles
 */
export enum MarketplaceTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  ENTHUSIASTIC = 'enthusiastic',
  LUXURY = 'luxury',
  BARGAIN = 'bargain',
}

/**
 * Description style variants for A/B testing
 */
export enum DescriptionStyle {
  FEATURE_FOCUSED = 'feature_focused', // Emphasizes features and specifications
  BENEFIT_FOCUSED = 'benefit_focused', // Emphasizes benefits to buyer
  STORY_BASED = 'story_based', // Tells a story about the product
  CONCISE = 'concise', // Short and to the point
  DETAILED = 'detailed', // Comprehensive and thorough
}

/**
 * Generate a prompt for creating an engaging marketplace title
 */
export function getTitlePrompt(
  productAnalysis: ProductAnalysis,
  tone: MarketplaceTone = MarketplaceTone.PROFESSIONAL
): string {
  const { productType, brand, condition, attributes } = productAnalysis;

  return `Create a catchy, engaging marketplace listing title for the following product:

Product Type: ${productType}
Brand: ${brand?.name || 'Unknown'}
Condition: ${condition}
${attributes.color ? `Color: ${attributes.color.join(', ')}` : ''}
${attributes.size ? `Size: ${attributes.size}` : ''}
${attributes.model ? `Model: ${attributes.model}` : ''}
${attributes.year ? `Year: ${attributes.year}` : ''}

Requirements:
- Length: 50-80 characters
- Tone: ${tone}
- Include the most important details (brand, model, condition)
- Be attention-grabbing and clear
- Use power words that drive engagement
- Avoid ALL CAPS (except acronyms)
- Do NOT use excessive punctuation (!!!, ???)

Return ONLY the title text, nothing else.`;
}

/**
 * Generate a prompt for creating a product description
 */
export function getDescriptionPrompt(
  productAnalysis: ProductAnalysis,
  tone: MarketplaceTone = MarketplaceTone.PROFESSIONAL,
  style: DescriptionStyle = DescriptionStyle.FEATURE_FOCUSED,
  wordCount: { min: number; max: number } = { min: 200, max: 500 }
): string {
  const {
    productType,
    brand,
    condition,
    attributes,
    features,
    description,
    defects,
  } = productAnalysis;

  const baseContext = `Create an engaging marketplace listing description for the following product:

Product Type: ${productType}
Brand: ${brand?.name || 'Unknown'}
Condition: ${condition}
${description ? `AI Analysis: ${description}` : ''}

Attributes:
${attributes.color ? `- Color: ${attributes.color.join(', ')}` : ''}
${attributes.material ? `- Material: ${attributes.material.join(', ')}` : ''}
${attributes.size ? `- Size: ${attributes.size}` : ''}
${attributes.model ? `- Model: ${attributes.model}` : ''}
${attributes.year ? `- Year: ${attributes.year}` : ''}
${attributes.dimensions ? `- Dimensions: ${JSON.stringify(attributes.dimensions)}` : ''}

${features.length > 0 ? `Key Features:\n${features.map((f) => `- ${f}`).join('\n')}` : ''}

${defects?.description ? `Condition Notes: ${defects.description}` : ''}
${defects?.severity ? `Defect Severity: ${defects.severity}` : ''}`;

  const styleGuidelines = getStyleGuidelines(style);
  const toneGuidelines = getToneGuidelines(tone);

  return `${baseContext}

Requirements:
- Length: ${wordCount.min}-${wordCount.max} words
- Tone: ${tone} - ${toneGuidelines}
- Style: ${style} - ${styleGuidelines}
- Include relevant emojis naturally (2-4 emojis total)
- Use bullet points or numbered lists for key information
- Highlight unique selling points
- Be honest about condition and any defects
- Include a compelling call-to-action at the end
- Format for easy readability with paragraphs and spacing

Structure:
1. Opening hook (1-2 sentences)
2. Main features and benefits (2-3 paragraphs)
3. Condition details (if applicable)
4. Call-to-action

Return ONLY the description text with formatting, nothing else.`;
}

/**
 * Get style-specific guidelines
 */
function getStyleGuidelines(style: DescriptionStyle): string {
  const guidelines: Record<DescriptionStyle, string> = {
    [DescriptionStyle.FEATURE_FOCUSED]:
      'Emphasize technical specifications, features, and what the product includes',
    [DescriptionStyle.BENEFIT_FOCUSED]:
      "Focus on how the product will improve the buyer's life and solve their problems",
    [DescriptionStyle.STORY_BASED]:
      'Tell a story about the product, its history, or how it can be used in daily life',
    [DescriptionStyle.CONCISE]:
      'Be brief and direct, highlighting only the most essential information',
    [DescriptionStyle.DETAILED]:
      'Provide comprehensive information covering all aspects of the product',
  };
  return guidelines[style];
}

/**
 * Get tone-specific guidelines
 */
function getToneGuidelines(tone: MarketplaceTone): string {
  const guidelines: Record<MarketplaceTone, string> = {
    [MarketplaceTone.PROFESSIONAL]:
      'Professional, clear, and trustworthy. Use proper grammar and formal language.',
    [MarketplaceTone.CASUAL]:
      'Friendly and conversational. Use everyday language like talking to a friend.',
    [MarketplaceTone.ENTHUSIASTIC]:
      'Energetic and exciting! Show passion and enthusiasm for the product.',
    [MarketplaceTone.LUXURY]:
      'Sophisticated and premium. Emphasize quality, exclusivity, and prestige.',
    [MarketplaceTone.BARGAIN]:
      'Value-focused and deal-oriented. Highlight savings and great price.',
  };
  return guidelines[tone];
}

/**
 * Generate a prompt for creating key selling points
 */
export function getSellingPointsPrompt(
  productAnalysis: ProductAnalysis,
  maxPoints: number = 5
): string {
  const { productType, brand, condition, features, attributes } =
    productAnalysis;

  return `Identify the ${maxPoints} most compelling selling points for this product:

Product Type: ${productType}
Brand: ${brand?.name || 'Unknown'}
Condition: ${condition}
Features: ${features.join(', ')}
${attributes.color ? `Color: ${attributes.color.join(', ')}` : ''}
${attributes.model ? `Model: ${attributes.model}` : ''}

Requirements:
- List exactly ${maxPoints} selling points
- Each point should be 5-15 words
- Focus on what makes this product desirable
- Include both features and benefits
- Prioritize unique or standout qualities
- Be specific and factual

Return ONLY a JSON array of strings, e.g., ["selling point 1", "selling point 2", ...]`;
}

/**
 * Generate a prompt for A/B testing variant
 */
export function getABTestingPrompt(
  productAnalysis: ProductAnalysis,
  variantType: 'title' | 'description',
  originalContent: string
): string {
  if (variantType === 'title') {
    return `Create an alternative version of this marketplace listing title for A/B testing:

Original Title: ${originalContent}

Product: ${productAnalysis.productType}
Brand: ${productAnalysis.brand?.name || 'Unknown'}

Requirements:
- Same length constraint (50-80 characters)
- Different wording and approach than the original
- Equally compelling but with a different angle
- Test a different emphasis (e.g., if original emphasizes brand, emphasize feature instead)

Return ONLY the alternative title text, nothing else.`;
  } else {
    return `Create an alternative version of this marketplace listing description for A/B testing:

Original Description:
${originalContent}

Product: ${productAnalysis.productType}

Requirements:
- Similar length to original
- Different style and approach (e.g., if original is feature-focused, make this benefit-focused)
- Maintain accuracy and key information
- Test a different tone or structure
- Include different but appropriate emojis

Return ONLY the alternative description text, nothing else.`;
  }
}

/**
 * Generate a prompt for emoji suggestions
 */
export function getEmojiSuggestionPrompt(
  productType: string,
  context: string
): string {
  return `Suggest 3-5 relevant emojis for a marketplace listing:

Product Type: ${productType}
Context: ${context}

Requirements:
- Emojis should be relevant to the product or context
- Common and widely recognized emojis
- Not overly playful for serious products
- Enhance the message without being distracting

Return ONLY a JSON array of emoji characters, e.g., ["✨", "🎯", "💫"]`;
}

/**
 * Generate a condition-aware tone recommendation
 */
export function getRecommendedTone(
  condition: ProductCondition,
  category: string
): MarketplaceTone {
  // Luxury items should use luxury tone if in good condition
  const luxuryCategories = [
    'jewelry',
    'watches',
    'designer',
    'luxury',
    'high-end',
  ];
  if (
    luxuryCategories.some((cat) => category.toLowerCase().includes(cat)) &&
    [ProductCondition.NEW, ProductCondition.LIKE_NEW].includes(condition)
  ) {
    return MarketplaceTone.LUXURY;
  }

  // Poor condition items should focus on value
  if ([ProductCondition.POOR, ProductCondition.FOR_PARTS].includes(condition)) {
    return MarketplaceTone.BARGAIN;
  }

  // Fair condition items can be casual/bargain
  if (condition === ProductCondition.FAIR) {
    return MarketplaceTone.CASUAL;
  }

  // Electronics and tech items often work well with enthusiastic tone
  const techCategories = ['electronics', 'tech', 'computer', 'phone', 'gaming'];
  if (techCategories.some((cat) => category.toLowerCase().includes(cat))) {
    return MarketplaceTone.ENTHUSIASTIC;
  }

  // Default to professional
  return MarketplaceTone.PROFESSIONAL;
}

/**
 * Generate a marketplace-specific formatting prompt
 */
export function getFormattingPrompt(
  marketplace:
    | 'facebook'
    | 'ebay'
    | 'craigslist'
    | 'offerup'
    | 'generic' = 'generic'
): string {
  const marketplaceGuidelines: Record<string, string> = {
    facebook:
      'Facebook Marketplace: Use casual tone, emojis welcome, focus on local pickup/delivery',
    ebay: 'eBay: Professional tone, detailed specs, mention shipping, include item specifics',
    craigslist:
      'Craigslist: Simple format, no emojis, focus on price and condition, include contact info',
    offerup:
      'OfferUp: Casual friendly tone, use emojis, highlight condition and price, mention meetup',
    generic:
      'General Marketplace: Balanced professional-casual tone, universal appeal',
  };

  return marketplaceGuidelines[marketplace];
}
