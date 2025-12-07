# AI Vision Service Documentation

## Overview

The AI Vision Service integrates OpenAI's GPT-4 Vision API to automatically analyze product photos and extract detailed information for marketplace listings. This service can identify products, detect conditions, extract text, and generate comprehensive product attributes.

## Features

- **Product Identification**: Automatically identifies product type, brand, and model
- **Condition Assessment**: Evaluates product condition (new, like new, excellent, good, fair, poor, for parts)
- **OCR Text Extraction**: Extracts text from product labels, tags, and packaging
- **Category Detection**: Multi-level category classification (primary, secondary, tertiary)
- **Attribute Generation**: Extracts color, material, size, dimensions, and other attributes
- **Defect Detection**: Identifies scratches, dents, stains, wear, and missing parts
- **Quality Assessment**: Evaluates image quality, lighting, and clarity
- **Title & Keywords**: Generates optimized listing titles and SEO keywords

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (with defaults)
OPENAI_VISION_MODEL=gpt-4o
OPENAI_MAX_TOKENS=1500
OPENAI_TEMPERATURE=0.3
```

### 3. Get OpenAI API Key

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key to your `.env` file

**Note**: GPT-4 Vision API access requires an OpenAI paid account.

## Usage

### Basic Example

```typescript
import { createAIVisionService } from './src/services/aiVisionService';

// Create service instance (uses OPENAI_API_KEY from environment)
const visionService = createAIVisionService();

// Analyze a product image
const result = await visionService.analyzeProduct('/path/to/product-image.jpg');

if (result.success) {
  const analysis = result.data;
  console.log('Product Type:', analysis.productType);
  console.log('Brand:', analysis.brand?.name);
  console.log('Condition:', analysis.condition);
  console.log('Categories:', analysis.category);
  console.log('Features:', analysis.features);
  console.log('Suggested Title:', analysis.suggestedTitle);
  console.log('Tokens Used:', result.tokensUsed);
} else {
  console.error('Analysis failed:', result.error);
}
```

### Advanced Options

```typescript
import { AnalysisOptions } from './src/types/productAnalysis';

const options: AnalysisOptions = {
  includeOCR: true,           // Enable text extraction
  detailedAnalysis: true,     // More thorough analysis (uses more tokens)
  generateTitle: true,        // Generate listing title
  generateKeywords: true,     // Generate SEO keywords
  maxTokens: 2000,           // Increase token limit
};

const result = await visionService.analyzeProduct(
  '/path/to/product-image.jpg',
  options
);
```

### Batch Processing

```typescript
// Analyze multiple images concurrently
const imagePaths = [
  '/path/to/image1.jpg',
  '/path/to/image2.jpg',
  '/path/to/image3.jpg',
];

const results = await visionService.analyzeMultipleProducts(imagePaths);

results.forEach((result, index) => {
  if (result.success) {
    console.log(`Image ${index + 1}:`, result.data?.productType);
  } else {
    console.error(`Image ${index + 1} failed:`, result.error);
  }
});
```

### Custom Configuration

```typescript
import { AIVisionService, AIVisionConfig } from './src/services/aiVisionService';

const config: AIVisionConfig = {
  apiKey: 'your-api-key',
  model: 'gpt-4o',           // or 'gpt-4-vision-preview'
  maxTokens: 2000,
  temperature: 0.3,          // Lower = more deterministic, Higher = more creative
};

const service = new AIVisionService(config);
```

## Response Structure

The analysis result includes:

```typescript
interface ProductAnalysis {
  // Core identification
  productType: string;                    // e.g., "Apple iPhone 13 Pro"
  category: ProductCategory;              // Multi-level categorization
  brand?: BrandIdentification;            // Brand with confidence
  condition: ProductCondition;            // Assessed condition
  conditionConfidence: ConfidenceLevel;   // Confidence in assessment

  // Detailed information
  attributes: ProductAttributes;          // Color, material, size, etc.
  extractedText: ExtractedText[];         // OCR results
  features: string[];                     // Notable features
  defects?: DetectedDefects;             // Identified issues

  // Visual analysis
  visualQuality: VisualQuality;          // Image quality assessment

  // Generated content
  description: string;                    // Natural language description
  suggestedTitle: string;                 // Optimized listing title
  suggestedKeywords: string[];           // SEO keywords

  // Metadata
  overallConfidence: ConfidenceLevel;     // Overall confidence
  analysisTimestamp: Date;                // When analyzed
}
```

## Error Handling

The service includes comprehensive error handling:

```typescript
const result = await visionService.analyzeProduct(imagePath);

if (!result.success) {
  const error = result.error;
  
  console.error('Error Code:', error.code);
  console.error('Message:', error.message);
  
  if (error.retryable) {
    // Retry logic for transient errors (rate limits, server errors)
    console.log('Error is retryable, waiting before retry...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    const retryResult = await visionService.analyzeProduct(imagePath);
  } else {
    // Handle non-retryable errors (bad requests, invalid images)
    console.error('Permanent error, cannot retry');
  }
}
```

### Common Error Codes

- `OPENAI_API_ERROR`: OpenAI API returned an error (check details for status)
- `ANALYSIS_ERROR`: General analysis error (file not found, parsing failed)
- `UNKNOWN_ERROR`: Unexpected error occurred

## Cost Considerations

GPT-4 Vision API costs are based on:
- **Image size**: Higher resolution = more tokens
- **Detail level**: `high` detail uses more tokens than `auto`
- **Response length**: Longer responses use more tokens

### Cost Optimization Tips

1. **Reduce image resolution**: Resize images to 2048x2048 or smaller
2. **Use `detailedAnalysis: false`** for faster, cheaper analysis
3. **Set `maxTokens`** to limit response length
4. **Cache results** to avoid re-analyzing the same product
5. **Batch processing** for efficiency

### Estimated Costs (as of 2024)

- Basic analysis: ~$0.01-0.03 per image
- Detailed analysis: ~$0.03-0.08 per image

*Note: Actual costs depend on image size and OpenAI pricing. Check [OpenAI Pricing](https://openai.com/pricing) for current rates.*

## Image Requirements

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

### Best Practices
- **Resolution**: 1024x1024 to 2048x2048 pixels
- **Lighting**: Good, even lighting without harsh shadows
- **Background**: Clean, uncluttered background
- **Focus**: Sharp, clear image of the product
- **Angle**: Multiple angles for complex products
- **Size**: Under 20MB per image

### Image Quality Tips
The service provides recommendations if image quality is poor:
- Better lighting needed
- Reduce background clutter
- Use higher resolution
- Improve focus/clarity

## Integration Example

```typescript
import express from 'express';
import multer from 'multer';
import { createAIVisionService } from './src/services/aiVisionService';

const app = express();
const upload = multer({ dest: 'uploads/' });
const visionService = createAIVisionService();

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    const result = await visionService.analyzeProduct(req.file.path);
    
    if (result.success) {
      res.json({
        success: true,
        analysis: result.data,
        tokensUsed: result.tokensUsed,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run only AI Vision Service tests
npm test -- aiVisionService.test.ts

# Run tests in watch mode
npm run test:watch
```

## Troubleshooting

### "OpenAI API key not provided"
- Ensure `OPENAI_API_KEY` is set in your `.env` file
- Check that `.env` file is in the project root
- Verify the key is valid and active

### "Rate limit exceeded"
- Wait a few seconds and retry
- The error is marked as `retryable: true`
- Consider implementing exponential backoff

### "Failed to read image file"
- Check that the file path is correct and absolute
- Ensure the image file exists and is readable
- Verify the image format is supported

### Poor Analysis Results
- Improve image quality (lighting, clarity, resolution)
- Use `detailedAnalysis: true` for better accuracy
- Provide multiple angles of the product
- Ensure product is clearly visible in the image

## API Reference

### Types

See `src/types/productAnalysis.ts` for complete type definitions:

- `ProductCondition`: Enum of possible conditions
- `ConfidenceLevel`: HIGH, MEDIUM, LOW
- `ProductCategory`: Multi-level categorization
- `BrandIdentification`: Brand info with confidence
- `ProductAttributes`: Color, material, size, etc.
- `ExtractedText`: OCR results with location
- `VisualQuality`: Image quality assessment
- `DetectedDefects`: Identified damage/wear
- `ProductAnalysis`: Complete analysis result
- `AnalysisOptions`: Configuration options
- `AnalysisResult`: Result wrapper with error handling

### Methods

#### `createAIVisionService(apiKey?: string): AIVisionService`
Factory function to create service instance from environment config.

#### `new AIVisionService(config: AIVisionConfig)`
Constructor for custom configuration.

#### `analyzeProduct(imagePath: string, options?: AnalysisOptions): Promise<AnalysisResult>`
Analyze a single product image.

#### `analyzeMultipleProducts(imagePaths: string[], options?: AnalysisOptions): Promise<AnalysisResult[]>`
Analyze multiple product images concurrently.

## License

ISC

## Support

For issues or questions:
1. Check this documentation
2. Review test files for examples (`tests/aiVisionService.test.ts`)
3. Open an issue on GitHub
4. Consult OpenAI API documentation

## Next Steps

After implementing the AI Vision Service, consider:

1. **Image Upload Integration**: Connect with storage service for uploaded images
2. **Result Caching**: Cache analysis results to reduce API costs
3. **UI Integration**: Build frontend for photo upload and analysis display
4. **Batch Processing Queue**: Implement job queue for high-volume analysis
5. **Price Discovery**: Integrate with marketplace APIs for pricing (Phase 5)
6. **Post Generation**: Use analysis results to generate listings (Phase 4)
