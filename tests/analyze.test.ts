/**
 * Tests for Analyze Endpoint
 */

import request from 'supertest';
import app from '../src/server';
import path from 'path';
import fs from 'fs';
import { ProductCondition } from '../src/types/productAnalysis';

describe('Analyze Endpoint', () => {
  const uploadDir = path.join(__dirname, '../uploads');

  // Ensure uploads directory exists before tests
  beforeAll(() => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  });

  // Clean up uploaded files after each test
  afterEach(() => {
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach((file) => {
        const filePath = path.join(uploadDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  describe('GET /analyze/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/analyze/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('aiVisionAvailable');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /analyze', () => {
    it('should return 503 when AI service not available and no file uploaded', async () => {
      // If API key is set, skip this test
      if (process.env.OPENAI_API_KEY) {
        return;
      }

      const response = await request(app).post('/analyze');

      // Can be either 400 (no file) or 503 (no AI service)
      // Depends on which check happens first
      expect([400, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 503 when AI service not available', async () => {
      // If API key is set, skip this test
      if (process.env.OPENAI_API_KEY) {
        return;
      }

      // Create a minimal valid JPEG file
      const testImagePath = path.join(__dirname, 'test-no-ai.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(testImagePath, jpegHeader);

      const response = await request(app)
        .post('/analyze')
        .attach('image', testImagePath);

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain(
        'AI Vision Service is not available'
      );

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should return 400 for invalid file type', async () => {
      // Create a text file (invalid)
      const testFilePath = path.join(__dirname, 'test-invalid.txt');
      fs.writeFileSync(testFilePath, 'This is not an image');

      const response = await request(app)
        .post('/analyze')
        .attach('image', testFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should return 400 for file size exceeding limit', async () => {
      // Create a file larger than 10MB
      const testFilePath = path.join(__dirname, 'test-large.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      jpegHeader.copy(largeBuffer, 0);
      fs.writeFileSync(testFilePath, largeBuffer);

      const response = await request(app)
        .post('/analyze')
        .attach('image', testFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('File size exceeds');

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should accept valid JPEG image without user details', async () => {
      // Skip if OpenAI API key is not available
      if (!process.env.OPENAI_API_KEY) {
        console.warn('Skipping test - OPENAI_API_KEY not set');
        return;
      }

      // Create a minimal valid JPEG file
      const testImagePath = path.join(__dirname, 'test-analyze.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(testImagePath, jpegHeader);

      const response = await request(app)
        .post('/analyze')
        .attach('image', testImagePath);

      // If AI service is not available, expect 503
      if (response.status === 503) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain(
          'AI Vision Service is not available'
        );
      } else {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('productType');
        expect(response.body.data).toHaveProperty('category');
        expect(response.body.data).toHaveProperty('condition');
        expect(response.body.data).toHaveProperty('dataSources');
        expect(response.body.data).toHaveProperty('validationStatus');
      }

      // Clean up test file
      fs.unlinkSync(testImagePath);
    }, 30000); // Increase timeout for API call

    it('should merge user details with AI analysis', async () => {
      // Skip if OpenAI API key is not available
      if (!process.env.OPENAI_API_KEY) {
        console.warn('Skipping test - OPENAI_API_KEY not set');
        return;
      }

      // Create a minimal valid JPEG file
      const testImagePath = path.join(__dirname, 'test-analyze-merge.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(testImagePath, jpegHeader);

      const userDetails = {
        brand: 'TestBrand',
        condition: ProductCondition.EXCELLENT,
        model: 'TestModel',
        color: ['Red', 'Blue'],
        customTitle: 'My Custom Title',
      };

      const response = await request(app)
        .post('/analyze')
        .field('userDetails', JSON.stringify(userDetails))
        .attach('image', testImagePath);

      // If AI service is not available, expect 503
      if (response.status === 503) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain(
          'AI Vision Service is not available'
        );
      } else {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('brand');
        expect(response.body.data.brand.name).toBe('TestBrand');
        expect(response.body.data.condition).toBe(ProductCondition.EXCELLENT);
        expect(response.body.data.attributes.model).toBe('TestModel');
        expect(response.body.data.attributes.color).toEqual(['Red', 'Blue']);
        expect(response.body.data.suggestedTitle).toBe('My Custom Title');
        expect(response.body.data).toHaveProperty('userProvidedDetails');
        expect(response.body.data.dataSources.brand).toBe('user');
        expect(response.body.data.dataSources.condition).toBe('user');
      }

      // Clean up test file
      fs.unlinkSync(testImagePath);
    }, 30000); // Increase timeout for API call

    it('should return 400 for invalid user details JSON', async () => {
      // If API key is not set, skip this test
      if (!process.env.OPENAI_API_KEY) {
        return;
      }

      // Create a minimal valid JPEG file
      const testImagePath = path.join(__dirname, 'test-analyze-invalid.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(testImagePath, jpegHeader);

      const response = await request(app)
        .post('/analyze')
        .field('userDetails', 'invalid json')
        .attach('image', testImagePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid JSON format');

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should return 400 for invalid user details content', async () => {
      // If API key is not set, skip this test
      if (!process.env.OPENAI_API_KEY) {
        return;
      }

      // Create a minimal valid JPEG file
      const testImagePath = path.join(__dirname, 'test-analyze-invalid2.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(testImagePath, jpegHeader);

      const invalidUserDetails = {
        condition: 'invalid_condition',
        year: '1700',
      };

      const response = await request(app)
        .post('/analyze')
        .field('userDetails', JSON.stringify(invalidUserDetails))
        .attach('image', testImagePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('validationErrors');
      expect(response.body.validationErrors.length).toBeGreaterThan(0);

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });
  });
});
