import { Injectable } from '@angular/core';
import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageCompressionService {
  private readonly defaultOptions: CompressionOptions = {
    maxSizeMB: 2, // Compress to max 2MB
    maxWidthOrHeight: 1920, // Max width or height 1920px
    useWebWorker: true,
    fileType: 'image/jpeg'
  };

  /**
   * Compress a single image file
   * @param file The image file to compress
   * @param options Optional compression options
   * @returns Promise<File> The compressed image file
   */
  async compressImage(file: File, options?: CompressionOptions): Promise<File> {
    try {
      const compressionOptions = {
        ...this.defaultOptions,
        ...options
      };

      // If file is already small enough, return as is
      if (file.size <= (compressionOptions.maxSizeMB! * 1024 * 1024)) {
        console.log(`Image ${file.name} is already small enough (${(file.size / 1024 / 1024).toFixed(2)}MB), skipping compression`);
        return file;
      }

      console.log(`Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const compressedFile = await imageCompression(file, {
        maxSizeMB: compressionOptions.maxSizeMB,
        maxWidthOrHeight: compressionOptions.maxWidthOrHeight,
        useWebWorker: compressionOptions.useWebWorker,
        fileType: compressionOptions.fileType || file.type
      });

      const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
      console.log(`✅ Image compressed: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`);

      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      // If compression fails, return original file
      return file;
    }
  }

  /**
   * Compress multiple image files
   * @param files Array of image files to compress
   * @param options Optional compression options
   * @returns Promise<File[]> Array of compressed image files
   */
  async compressImages(files: File[], options?: CompressionOptions): Promise<File[]> {
    try {
      console.log(`Compressing ${files.length} image(s)...`);
      
      const compressionPromises = files.map(file => this.compressImage(file, options));
      const compressedFiles = await Promise.all(compressionPromises);
      
      const totalOriginalSize = files.reduce((sum, file) => sum + file.size, 0);
      const totalCompressedSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
      const totalCompressionRatio = ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1);
      
      console.log(`✅ All images compressed: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB → ${(totalCompressedSize / 1024 / 1024).toFixed(2)}MB (${totalCompressionRatio}% reduction)`);
      
      return compressedFiles;
    } catch (error) {
      console.error('Error compressing images:', error);
      // If compression fails, return original files
      return files;
    }
  }

  /**
   * Validate image file
   * @param file The file to validate
   * @param maxSizeMB Maximum file size in MB (before compression)
   * @returns Object with isValid boolean and error message if invalid
   */
  validateImage(file: File, maxSizeMB: number = 50): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: `${file.name} is not a valid image file` };
    }

    // Check file size (allow larger files as they will be compressed)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { 
        isValid: false, 
        error: `${file.name} is too large (max ${maxSizeMB}MB). Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
      };
    }

    return { isValid: true };
  }
}












