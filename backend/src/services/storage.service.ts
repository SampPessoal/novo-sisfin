import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../config/logger';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const s3Client = env.STORAGE_PROVIDER === 's3'
  ? new S3Client({
      region: env.AWS_REGION,
      credentials: env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined,
    })
  : null;

const LOCAL_STORAGE_PATH = path.join(process.cwd(), 'uploads');

export class StorageService {
  static async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'comprovantes'
  ): Promise<string> {
    const ext = path.extname(originalName);
    const key = `${folder}/${uuidv4()}${ext}`;

    if (env.STORAGE_PROVIDER === 's3' && s3Client) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );
      logger.info('File uploaded to S3', { key });
      return key;
    }

    const localPath = path.join(LOCAL_STORAGE_PATH, folder);
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath, { recursive: true });
    }
    const filePath = path.join(localPath, `${uuidv4()}${ext}`);
    fs.writeFileSync(filePath, buffer);
    logger.info('File saved locally', { path: filePath });
    return filePath;
  }

  static async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (env.STORAGE_PROVIDER === 's3' && s3Client) {
      const command = new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
      });
      return getSignedUrl(s3Client, command, { expiresIn });
    }

    return key;
  }

  static async delete(key: string): Promise<void> {
    if (env.STORAGE_PROVIDER === 's3' && s3Client) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: key,
        })
      );
      logger.info('File deleted from S3', { key });
      return;
    }

    if (fs.existsSync(key)) {
      fs.unlinkSync(key);
      logger.info('File deleted locally', { path: key });
    }
  }
}
