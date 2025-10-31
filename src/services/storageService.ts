import { supabase } from './supabaseService';

const BUCKET_NAME = 'program-resources';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'text/plain',
  'text/csv'
];

export const storageService = {
  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(file: File, folder: string = ''): Promise<{url: string, path: string} | null> {
    try {
      // Validate file
      if (!this.validateFile(file)) {
        throw new Error('Invalid file type or size');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      console.log('Uploading file:', { name: file.name, size: file.size, type: file.type, path: filePath });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      console.log('File uploaded successfully:', publicUrl);

      return {
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      return null;
    }
  },

  /**
   * Download a file from Supabase Storage
   */
  async downloadFile(path: string, fileName?: string): Promise<void> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(path);

      if (error) {
        console.error('Download error:', error);
        throw error;
      }

      // Create blob and download
      const blob = new Blob([data], { type: data.type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  },

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  },

  /**
   * Get a signed URL for temporary access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('Error getting signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      return null;
    }
  },

  /**
   * Validate file before upload
   */
  validateFile(file: File): boolean {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      alert(`File size exceeds maximum allowed size of ${this.formatFileSize(MAX_FILE_SIZE)}`);
      return false;
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      // Check by extension if MIME type is not recognized
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'txt', 'csv'];
      if (!ext || !allowedExtensions.includes(ext)) {
        alert('File type not allowed. Please upload PDF, Word, Excel, Image, Video, or Text files.');
        return false;
      }
    }

    return true;
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
};