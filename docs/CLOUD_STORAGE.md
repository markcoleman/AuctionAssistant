# Cloud Storage Integration Guide

This document describes the cloud storage integration implemented in AuctionAssistant.

## Overview

The cloud storage service provides a unified abstraction layer for managing file uploads across multiple cloud providers, with support for:
- AWS S3
- Azure Blob Storage
- Local filesystem (for development/testing)

## Architecture

### Storage Service (`src/services/storageService.ts`)

The `StorageService` class provides a provider-agnostic interface for:
- File uploads with optional image optimization
- Secure URL generation with expiration
- File deletion
- File existence checking
- Automatic cleanup of temporary files

### Configuration

The storage service is configured via environment variables and the centralized config in `src/config.ts`.

#### Environment Variables

See `.env.example` for all available configuration options:

```bash
# Storage provider selection
STORAGE_PROVIDER=local  # Options: local, aws, azure

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Azure Blob Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=your_account
AZURE_STORAGE_ACCOUNT_KEY=your_key
AZURE_STORAGE_CONTAINER_NAME=your-container

# Image Optimization
IMAGE_MAX_WIDTH=2048
IMAGE_MAX_HEIGHT=2048
IMAGE_QUALITY=85
ENABLE_IMAGE_OPTIMIZATION=true  # Optional, auto-enabled in production

# Secure URLs
SECURE_URL_EXPIRATION=3600  # seconds (1 hour default)
```

## Usage

### Basic Upload

The upload endpoint (`/upload`) automatically uses the configured storage provider:

```bash
curl -X POST http://localhost:3000/upload \
  -F "image=@photo.jpg"
```

Response:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "id": "uploads/1234567890-abc123.jpg",
    "originalName": "photo.jpg",
    "mimetype": "image/jpeg",
    "size": 123456,
    "url": "https://bucket.s3.region.amazonaws.com/uploads/...",
    "secureUrl": "https://bucket.s3.region.amazonaws.com/uploads/...?signature=...",
    "uploadedAt": "2025-12-07T04:00:00.000Z"
  }
}
```

### Using the Storage Service Directly

```typescript
import { createStorageService } from './services/storageService';
import config from './config';

// Initialize service
const storageService = createStorageService(config.storage);

// Upload a file
const result = await storageService.uploadFile(
  '/path/to/file.jpg',
  'image/jpeg',
  {
    optimize: true,
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 80
  }
);

// Generate secure URL
const secureUrl = await storageService.getSecureUrl(
  result.key,
  { expiresIn: 3600 }
);

// Check if file exists
const exists = await storageService.fileExists(result.key);

// Delete file
await storageService.deleteFile(result.key);

// Cleanup temporary files
await storageService.cleanupTempFile('/tmp/upload.jpg');
```

## Features

### Image Optimization

When enabled, the service automatically:
- Resizes images to fit within max dimensions (maintaining aspect ratio)
- Compresses images to specified quality (JPEG)
- Converts images to JPEG format for consistency

Optimization is:
- Disabled by default in development/test (to support minimal test images)
- Enabled by default in production
- Can be explicitly enabled via `ENABLE_IMAGE_OPTIMIZATION=true`

### Secure URLs

Generated URLs include:
- **AWS S3**: Pre-signed URLs with expiration
- **Azure Blob**: SAS tokens with time-limited access
- **Local**: Standard file paths (no expiration)

### Automatic Cleanup

The upload route automatically:
1. Receives file upload to temporary local storage (multer)
2. Uploads to cloud storage
3. Deletes temporary local file
4. Returns cloud URLs in response

## Provider-Specific Setup

### AWS S3

1. Create an S3 bucket
2. Create IAM user with permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:HeadObject"
         ],
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```
3. Configure environment variables with IAM credentials

### Azure Blob Storage

1. Create a storage account
2. Create a container
3. Get account key from Azure Portal
4. Configure environment variables

### Local Storage

Automatically configured for development. Files stored in `uploads/` directory.

## Testing

Run tests with:
```bash
npm test
```

Test coverage includes:
- Local storage operations
- File upload/download
- Secure URL generation
- File deletion
- Error handling
- Temporary file cleanup

## Security Considerations

1. **Credentials**: Never commit credentials to version control
2. **URLs**: Secure URLs expire after configured time
3. **Validation**: File type and size validation occurs before upload
4. **Access**: Configure bucket/container permissions appropriately
5. **HTTPS**: Always use HTTPS in production

## Troubleshooting

### "AWS S3 client not initialized"
- Verify `STORAGE_PROVIDER=aws` is set
- Ensure all AWS environment variables are configured
- Check AWS credentials have correct permissions

### "Azure Blob client not initialized"
- Verify `STORAGE_PROVIDER=azure` is set
- Ensure all Azure environment variables are configured
- Check account key is valid

### Image optimization errors
- In development: Optimization is disabled by default
- Use valid image files for testing when optimization is enabled
- Check Sharp library installation: `npm list sharp`

## Migration from Local to Cloud

1. Update `.env` with cloud provider credentials
2. Change `STORAGE_PROVIDER` to `aws` or `azure`
3. Restart application
4. Test upload functionality
5. Migrate existing files if needed (manual process)

## Performance Considerations

- Image optimization adds processing time (~100-500ms per image)
- Large files take longer to upload to cloud storage
- Secure URL generation is fast (< 10ms)
- Consider implementing upload progress for large files

## Future Enhancements

Potential improvements:
- Support for additional providers (Google Cloud Storage)
- Background job processing for optimization
- CDN integration
- Batch upload support
- Image thumbnail generation
- Metadata extraction
- Virus scanning integration
