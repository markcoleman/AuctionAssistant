/**
 * File validation utilities for upload handling
 */

// Supported MIME types
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// Maximum file size: 10MB in bytes
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// File extensions mapping
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

/**
 * Validates if the file type is allowed
 * @param mimetype - The MIME type of the file
 * @returns True if the file type is allowed, false otherwise
 */
export function isAllowedFileType(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.includes(
    mimetype as (typeof ALLOWED_MIME_TYPES)[number]
  );
}

/**
 * Validates if the file size is within the allowed limit
 * @param size - The size of the file in bytes
 * @returns True if the file size is within the limit, false otherwise
 */
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Validates if the file extension is allowed
 * @param filename - The name of the file
 * @returns True if the file extension is allowed, false otherwise
 */
export function hasAllowedExtension(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
}

/**
 * Comprehensive file validation
 * @param file - Object containing file information
 * @returns Object with validation result and error message if any
 */
export function validateFile(file: {
  mimetype: string;
  size: number;
  originalname: string;
}): { valid: boolean; error?: string } {
  if (!isAllowedFileType(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  if (!isValidFileSize(file.size)) {
    return {
      valid: false,
      error: `File size must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (!hasAllowedExtension(file.originalname)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}
