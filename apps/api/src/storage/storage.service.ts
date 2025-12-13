import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || 'glyphhash-evidence';
    
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      endpoint: process.env.AWS_ENDPOINT,
      forcePathStyle: true, // Required for LocalStack
    });
  }

  /**
   * Generate a pre-signed upload URL for client-side upload
   */
  async getUploadUrl(
    tenantId: string,
    fileName: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const fileKey = `${tenantId}/${crypto.randomUUID()}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return { uploadUrl, fileKey };
  }

  /**
   * Generate a pre-signed download URL
   */
  async getDownloadUrl(fileKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  /**
   * Upload file directly (for server-side uploads)
   */
  async uploadFile(
    tenantId: string,
    fileName: string,
    content: Buffer,
    contentType: string,
  ): Promise<string> {
    const fileKey = `${tenantId}/${crypto.randomUUID()}/${fileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: content,
        ContentType: contentType,
      }),
    );

    return fileKey;
  }

  /**
   * Calculate SHA-256 hash of file content
   */
  calculateHash(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
