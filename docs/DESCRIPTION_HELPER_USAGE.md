# Description Helper System - Usage Guide

This document describes how to use the Description Helper System implemented in Phase 3.2.

## Overview

The Description Helper System allows users to provide additional context about products, which is then intelligently merged with AI-generated analysis from product photos. This creates more accurate and complete product listings.

## API Endpoints

### POST /analyze

Analyzes a product photo and optionally merges user-provided details.

#### Request

**Content-Type:** `multipart/form-data`

**Fields:**
- `image` (required): Product image file (JPEG, PNG, or WebP, max 10MB)
- `userDetails` (optional): JSON string with additional product information

#### User Details Schema

```json
{
  "condition": "excellent",           // Optional: Product condition enum
  "brand": "Apple",                   // Optional: Brand name (max 100 chars)
  "model": "iPhone 13 Pro",          // Optional: Model name (max 100 chars)
  "productType": "Smartphone",       // Optional: Product type (max 200 chars)
  "description": "Custom description", // Optional: User description (max 5000 chars)
  "color": ["Blue", "Silver"],       // Optional: Array of colors (max 10)
  "material": ["Aluminum", "Glass"], // Optional: Array of materials (max 10)
  "size": "6.1 inches",              // Optional: Size information
  "year": "2021",                    // Optional: Year (1800-current year+1)
  "categorySpecificDetails": {       // Optional: Category-specific attributes
    "screenSize": "6.1 inches",
    "storage": "128GB"
  },
  "customTitle": "Amazing iPhone!",  // Optional: Custom listing title (max 200 chars)
  "customKeywords": ["smartphone", "iOS"], // Optional: Additional keywords (max 20)
  "notes": "Internal notes"          // Optional: Internal notes (not for listing)
}
```

#### Valid Condition Values
- `new` - Brand new, never used
- `like_new` - Like new, minimal use
- `excellent` - Excellent condition
- `good` - Good condition, minor wear
- `fair` - Fair condition, noticeable wear
- `poor` - Poor condition, significant wear
- `for_parts` - For parts or repair
- `unknown` - Condition unknown

#### Example Request (JavaScript)

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const userDetails = {
  brand: 'Apple',
  condition: 'excellent',
  color: ['Blue'],
  year: '2021'
};

formData.append('userDetails', JSON.stringify(userDetails));

const response = await fetch('/analyze', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

#### Example Request (curl)

```bash
# Without user details
curl -X POST http://localhost:3000/analyze \
  -F "image=@product.jpg"

# With user details
curl -X POST http://localhost:3000/analyze \
  -F "image=@product.jpg" \
  -F 'userDetails={"brand":"Apple","condition":"excellent","color":["Blue"]}'
```

#### Response (Success)

```json
{
  "success": true,
  "message": "Product analyzed successfully",
  "tokensUsed": 1234,
  "timestamp": "2025-12-07T12:00:00.000Z",
  "data": {
    "productType": "Apple iPhone 13",
    "category": {
      "primary": "Electronics",
      "secondary": "Smartphones",
      "confidence": "high"
    },
    "brand": {
      "name": "Apple",
      "confidence": "high",
      "verified": true
    },
    "condition": "excellent",
    "conditionConfidence": "high",
    "attributes": {
      "color": ["Blue"],
      "model": "iPhone 13",
      "size": "6.1 inches"
    },
    "description": "Apple iPhone 13 in blue color...",
    "suggestedTitle": "Apple iPhone 13 - Blue, 128GB",
    "suggestedKeywords": ["iPhone", "Apple", "smartphone"],
    "dataSources": {
      "productType": "ai",
      "brand": "user",
      "condition": "user",
      "attributes": "merged",
      "description": "ai",
      "title": "ai"
    },
    "validationStatus": {
      "isComplete": true,
      "missingFields": [],
      "warnings": []
    },
    "userProvidedDetails": {
      "brand": "Apple",
      "condition": "excellent",
      "color": ["Blue"]
    },
    "overallConfidence": "high",
    "analysisTimestamp": "2025-12-07T12:00:00.000Z"
  }
}
```

#### Response (Error - No AI Service)

```json
{
  "success": false,
  "error": "AI Vision Service is not available. Please configure OPENAI_API_KEY."
}
```

Status Code: 503

#### Response (Error - Invalid User Details)

```json
{
  "success": false,
  "error": "Invalid user details",
  "validationErrors": [
    "Invalid condition value. Must be one of: new, like_new, excellent, good, fair, poor, for_parts, unknown",
    "Invalid year. Must be between 1800 and 2026"
  ]
}
```

Status Code: 400

### GET /analyze/health

Check if the analyze service is available.

#### Response

```json
{
  "success": true,
  "aiVisionAvailable": true,
  "timestamp": "2025-12-07T12:00:00.000Z"
}
```

## Data Sources

The `dataSources` field in the response indicates where each piece of data came from:

- `"ai"` - Data came from AI analysis only
- `"user"` - Data came from user input only (overriding AI)
- `"merged"` - Data is a combination of AI and user input

## Validation Status

The `validationStatus` field provides feedback on the completeness of the product data:

- `isComplete` (boolean) - Whether all required fields are present
- `missingFields` (array) - List of required fields that are missing
- `warnings` (array) - Non-critical issues to review

### Common Warnings

- "Overall AI confidence is low - consider reviewing results"
- "Condition assessment confidence is low"
- "Brand not identified - consider adding manually"
- "Color not identified"
- "Image quality is poor - consider uploading better photos"
- "Background is distracting - cleaner photos may improve analysis"

## Merge Behavior

When user details are provided, the system intelligently merges them with AI analysis:

1. **Priority:** User data takes precedence over AI predictions
2. **Confidence Boost:** User-provided data is marked as "high" confidence
3. **Enhancement:** Descriptions can be combined (AI + user text)
4. **Deduplication:** Keywords are deduplicated when merging
5. **Tracking:** All sources are tracked in `dataSources`

## Best Practices

1. **Provide What You Know:** Only include fields you're certain about
2. **Review AI Results:** Check warnings in validation status
3. **Better Photos:** Higher quality images lead to better AI analysis
4. **Category Details:** Use `categorySpecificDetails` for specialized attributes
5. **Iterative Refinement:** Re-analyze with user corrections if AI confidence is low

## Error Codes

- **400** - Bad request (invalid file, invalid user details, file too large)
- **500** - Internal server error (AI analysis failed)
- **503** - Service unavailable (AI Vision Service not configured)

## Configuration

To use the analyze endpoint, ensure the following environment variables are set:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional
OPENAI_VISION_MODEL=gpt-4o          # Default: gpt-4o
OPENAI_MAX_TOKENS=1500              # Default: 1500
OPENAI_TEMPERATURE=0.3              # Default: 0.3
```

## Integration Example

Here's a complete example of integrating the Description Helper System:

```javascript
async function analyzeProduct(imageFile, userInput = {}) {
  // Step 1: Create form data
  const formData = new FormData();
  formData.append('image', imageFile);
  
  // Step 2: Add user details if provided
  if (Object.keys(userInput).length > 0) {
    formData.append('userDetails', JSON.stringify(userInput));
  }
  
  // Step 3: Send request
  const response = await fetch('/analyze', {
    method: 'POST',
    body: formData
  });
  
  // Step 4: Handle response
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  const result = await response.json();
  
  // Step 5: Check validation status
  if (!result.data.validationStatus.isComplete) {
    console.warn('Missing fields:', result.data.validationStatus.missingFields);
  }
  
  if (result.data.validationStatus.warnings.length > 0) {
    console.warn('Warnings:', result.data.validationStatus.warnings);
  }
  
  return result.data;
}

// Usage
const productData = await analyzeProduct(imageFile, {
  brand: 'Apple',
  condition: 'excellent',
  color: ['Blue'],
  customTitle: 'Amazing iPhone - Great Deal!'
});

console.log('Product Type:', productData.productType);
console.log('Suggested Title:', productData.suggestedTitle);
console.log('Confidence:', productData.overallConfidence);
```

## Notes

- All file validations are performed before AI analysis to save costs
- Temporary files are automatically cleaned up after processing
- The system supports JPEG, PNG, and WebP image formats
- Maximum file size is 10MB
- User input validation happens before AI processing
