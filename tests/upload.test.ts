import request from 'supertest';
import app from '../src/server';
import path from 'path';
import fs from 'fs';

describe('Upload Endpoint', () => {
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
        fs.unlinkSync(path.join(uploadDir, file));
      });
    }
  });

  describe('POST /upload', () => {
    it('should successfully upload a valid JPEG image', async () => {
      // Create a minimal valid JPEG file for testing
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(testImagePath, jpegHeader);

      const response = await request(app)
        .post('/upload')
        .attach('image', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty(
        'message',
        'File uploaded successfully'
      );
      expect(response.body).toHaveProperty('file');
      expect(response.body.file).toHaveProperty('id');
      expect(response.body.file).toHaveProperty(
        'originalName',
        'test-image.jpg'
      );
      expect(response.body.file).toHaveProperty('mimetype', 'image/jpeg');
      expect(response.body.file).toHaveProperty('size');
      expect(response.body.file).toHaveProperty('uploadedAt');

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should successfully upload a valid PNG image', async () => {
      // Create a minimal valid PNG file for testing
      const testImagePath = path.join(__dirname, 'test-image.png');
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      fs.writeFileSync(testImagePath, pngHeader);

      const response = await request(app)
        .post('/upload')
        .attach('image', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.file).toHaveProperty('mimetype', 'image/png');

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should successfully upload a valid WebP image', async () => {
      // Create a minimal valid WebP file for testing
      const testImagePath = path.join(__dirname, 'test-image.webp');
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      fs.writeFileSync(testImagePath, webpHeader);

      const response = await request(app)
        .post('/upload')
        .attach('image', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.file).toHaveProperty('mimetype', 'image/webp');

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should reject upload when no file is provided', async () => {
      const response = await request(app).post('/upload');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'No file uploaded');
    });

    it('should reject files with invalid MIME type', async () => {
      // Create a text file
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'This is a text file');

      const response = await request(app)
        .post('/upload')
        .attach('image', testFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid file type');

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should reject files exceeding size limit', async () => {
      // Create a file larger than 10MB
      const testImagePath = path.join(__dirname, 'large-image.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      fs.writeFileSync(testImagePath, Buffer.concat([jpegHeader, largeBuffer]));

      const response = await request(app)
        .post('/upload')
        .attach('image', testImagePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should reject files with invalid extension even if MIME type is spoofed', async () => {
      // Create a file with .exe extension but valid JPEG header
      const testFilePath = path.join(__dirname, 'malicious.exe');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(testFilePath, jpegHeader);

      const response = await request(app)
        .post('/upload')
        .attach('image', testFilePath);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should generate unique file IDs for multiple uploads', async () => {
      const testImagePath1 = path.join(__dirname, 'test-image-1.jpg');
      const testImagePath2 = path.join(__dirname, 'test-image-2.jpg');
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      fs.writeFileSync(testImagePath1, jpegHeader);
      fs.writeFileSync(testImagePath2, jpegHeader);

      const response1 = await request(app)
        .post('/upload')
        .attach('image', testImagePath1);

      const response2 = await request(app)
        .post('/upload')
        .attach('image', testImagePath2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.file.id).not.toBe(response2.body.file.id);

      // Clean up test files
      fs.unlinkSync(testImagePath1);
      fs.unlinkSync(testImagePath2);
    });
  });
});
