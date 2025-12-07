/**
 * Cloud Storage Service
 * Provides abstraction for cloud storage operations (AWS S3 and Azure Blob Storage)
 * with image optimization, secure URL generation, and automatic cleanup
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import sharp from 'sharp';
import { unlink } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Storage provider types
export type StorageProvider = 'aws' | 'azure' | 'local';

// Storage configuration interface
export interface StorageConfig {
  provider: StorageProvider;
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  azure?: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
  local?: {
    uploadDir: string;
  };
}

// Upload options interface
export interface UploadOptions {
  optimize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

// Upload result interface
export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

// URL options interface
export interface SecureUrlOptions {
  expiresIn?: number; // seconds
}

/**
 * Cloud Storage Service Class
 * Handles file uploads, downloads, and management across different cloud providers
 */
export class StorageService {
  private config: StorageConfig;
  private s3Client?: S3Client;
  private azureBlobServiceClient?: BlobServiceClient;

  constructor(config: StorageConfig) {
    this.config = config;

    // Initialize AWS S3 client if provider is AWS
    if (config.provider === 'aws' && config.aws) {
      this.s3Client = new S3Client({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        },
      });
    }

    // Initialize Azure Blob client if provider is Azure
    if (config.provider === 'azure' && config.azure) {
      const credential = new StorageSharedKeyCredential(
        config.azure.accountName,
        config.azure.accountKey
      );
      this.azureBlobServiceClient = new BlobServiceClient(
        `https://${config.azure.accountName}.blob.core.windows.net`,
        credential
      );
    }
  }

  /**
   * Upload a file to cloud storage
   * @param filePath - Local path to the file to upload
   * @param contentType - MIME type of the file
   * @param options - Upload options including optimization settings
   * @returns Upload result with URL and metadata
   */
  async uploadFile(
    filePath: string,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      optimize = true,
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 85,
    } = options;

    // Generate unique key for the file
    const key = this.generateKey(path.extname(filePath));

    // Optimize image if requested
    let buffer: Buffer;
    let finalContentType = contentType;
    let fileSize: number;

    if (optimize && this.isImage(contentType)) {
      const optimized = await this.optimizeImage(filePath, {
        maxWidth,
        maxHeight,
        quality,
      });
      buffer = optimized.buffer;
      fileSize = optimized.size;
      finalContentType = optimized.contentType;
    } else {
      // Read file as buffer without optimization
      const fs = await import('fs/promises');
      buffer = await fs.readFile(filePath);
      fileSize = buffer.length;
    }

    // Upload based on provider
    let url: string;

    switch (this.config.provider) {
      case 'aws':
        url = await this.uploadToS3(key, buffer, finalContentType);
        break;
      case 'azure':
        url = await this.uploadToAzure(key, buffer, finalContentType);
        break;
      case 'local':
        url = await this.uploadToLocal(key, buffer, finalContentType);
        break;
      default:
        throw new Error(
          `Unsupported storage provider: ${this.config.provider}`
        );
    }

    return {
      key,
      url,
      size: fileSize,
      contentType: finalContentType,
    };
  }

  /**
   * Generate a secure URL with expiration
   * @param key - The file key/identifier
   * @param options - URL generation options
   * @returns Secure URL with expiration
   */
  async getSecureUrl(
    key: string,
    options: SecureUrlOptions = {}
  ): Promise<string> {
    const { expiresIn = 3600 } = options; // Default 1 hour

    switch (this.config.provider) {
      case 'aws':
        return this.getS3SignedUrl(key, expiresIn);
      case 'azure':
        return this.getAzureSasUrl(key, expiresIn);
      case 'local':
        // For local storage, return the URL as-is (no expiration)
        return this.getLocalUrl(key);
      default:
        throw new Error(
          `Unsupported storage provider: ${this.config.provider}`
        );
    }
  }

  /**
   * Delete a file from cloud storage
   * @param key - The file key/identifier
   */
  async deleteFile(key: string): Promise<void> {
    switch (this.config.provider) {
      case 'aws':
        await this.deleteFromS3(key);
        break;
      case 'azure':
        await this.deleteFromAzure(key);
        break;
      case 'local':
        await this.deleteFromLocal(key);
        break;
      default:
        throw new Error(
          `Unsupported storage provider: ${this.config.provider}`
        );
    }
  }

  /**
   * Cleanup temporary local files
   * @param filePath - Path to the temporary file to delete
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error) {
      // Log but don't throw - file might already be deleted
      console.error(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  /**
   * Check if file exists in storage
   * @param key - The file key/identifier
   * @returns True if file exists, false otherwise
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'aws':
          return await this.s3FileExists(key);
        case 'azure':
          return await this.azureFileExists(key);
        case 'local':
          return await this.localFileExists(key);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // Private helper methods

  private generateKey(extension: string): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `uploads/${timestamp}-${randomBytes}${extension}`;
  }

  private isImage(contentType: string): boolean {
    return contentType.startsWith('image/');
  }

  private async optimizeImage(
    filePath: string,
    options: { maxWidth: number; maxHeight: number; quality: number }
  ): Promise<{ buffer: Buffer; size: number; contentType: string }> {
    const { maxWidth, maxHeight, quality } = options;

    const buffer = await sharp(filePath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();

    return {
      buffer,
      size: buffer.length,
      contentType: 'image/jpeg',
    };
  }

  // AWS S3 methods

  private async uploadToS3(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    if (!this.s3Client || !this.config.aws) {
      throw new Error('AWS S3 client not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.config.aws.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    return `https://${this.config.aws.bucket}.s3.${this.config.aws.region}.amazonaws.com/${key}`;
  }

  private async getS3SignedUrl(
    key: string,
    expiresIn: number
  ): Promise<string> {
    if (!this.s3Client || !this.config.aws) {
      throw new Error('AWS S3 client not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.config.aws.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private async deleteFromS3(key: string): Promise<void> {
    if (!this.s3Client || !this.config.aws) {
      throw new Error('AWS S3 client not initialized');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.config.aws.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private async s3FileExists(key: string): Promise<boolean> {
    if (!this.s3Client || !this.config.aws) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.aws.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  // Azure Blob Storage methods

  private async uploadToAzure(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    if (!this.azureBlobServiceClient || !this.config.azure) {
      throw new Error('Azure Blob client not initialized');
    }

    const containerClient = this.azureBlobServiceClient.getContainerClient(
      this.config.azure.containerName
    );
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    return blockBlobClient.url;
  }

  private async getAzureSasUrl(
    key: string,
    expiresIn: number
  ): Promise<string> {
    if (!this.azureBlobServiceClient || !this.config.azure) {
      throw new Error('Azure Blob client not initialized');
    }

    const containerClient = this.azureBlobServiceClient.getContainerClient(
      this.config.azure.containerName
    );
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresIn * 1000);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.config.azure.containerName,
        blobName: key,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      },
      new StorageSharedKeyCredential(
        this.config.azure.accountName,
        this.config.azure.accountKey
      )
    ).toString();

    return `${blockBlobClient.url}?${sasToken}`;
  }

  private async deleteFromAzure(key: string): Promise<void> {
    if (!this.azureBlobServiceClient || !this.config.azure) {
      throw new Error('Azure Blob client not initialized');
    }

    const containerClient = this.azureBlobServiceClient.getContainerClient(
      this.config.azure.containerName
    );
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    await blockBlobClient.delete();
  }

  private async azureFileExists(key: string): Promise<boolean> {
    if (!this.azureBlobServiceClient || !this.config.azure) {
      return false;
    }

    try {
      const containerClient = this.azureBlobServiceClient.getContainerClient(
        this.config.azure.containerName
      );
      const blockBlobClient = containerClient.getBlockBlobClient(key);
      await blockBlobClient.getProperties();
      return true;
    } catch {
      return false;
    }
  }

  // Local storage methods (for development/testing)

  private async uploadToLocal(
    key: string,
    buffer: Buffer,
    _contentType: string
  ): Promise<string> {
    if (!this.config.local) {
      throw new Error('Local storage not configured');
    }

    const fs = await import('fs/promises');
    const filePath = path.join(this.config.local.uploadDir, key);
    const dirPath = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    return `/uploads/${key}`;
  }

  private getLocalUrl(key: string): string {
    return `/uploads/${key}`;
  }

  private async deleteFromLocal(key: string): Promise<void> {
    if (!this.config.local) {
      throw new Error('Local storage not configured');
    }

    const filePath = path.join(this.config.local.uploadDir, key);
    await unlink(filePath);
  }

  private async localFileExists(key: string): Promise<boolean> {
    if (!this.config.local) {
      return false;
    }

    try {
      const fs = await import('fs/promises');
      const filePath = path.join(this.config.local.uploadDir, key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a storage service instance based on environment configuration
 */
export function createStorageService(config: StorageConfig): StorageService {
  return new StorageService(config);
}
