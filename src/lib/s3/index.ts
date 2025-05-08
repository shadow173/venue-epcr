// src/lib/s3/index.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Constants
const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Generate unique key for S3
export const generateS3Key = (folderPath: string, fileName: string) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  const extension = fileName.split('.').pop();
  return `${folderPath}/${timestamp}-${randomString}.${extension}`;
};

// Upload file to S3
export const uploadToS3 = async (
  buffer: Buffer,
  contentType: string,
  key: string
): Promise<string> => {
  if (!ALLOWED_FILE_TYPES.includes(contentType)) {
    throw new Error('Invalid file type');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File size exceeds limit');
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file');
  }
};

// Delete file from S3
export const deleteFromS3 = async (key: string): Promise<void> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error('Failed to delete file');
  }
};

// Generate presigned URL for downloading a file
export const getPresignedUrl = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate download link');
  }
};