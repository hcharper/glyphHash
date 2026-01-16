/**
 * Storage Service
 * ===============
 * Handles file storage (local or S3)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

export interface StorageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StoredFile {
  filename: string;
  storagePath: string;
  size: number;
}

// Storage base path (local storage for MVP)
const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

/**
 * Ensure storage directory exists
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

/**
 * Store a file
 */
export async function storeFile(file: StorageFile): Promise<StoredFile> {
  const ext = path.extname(file.originalname);
  const filename = `${uuid()}${ext}`;
  
  // Organize by date: storage/2024/01/15/
  const now = new Date();
  const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const dirPath = path.join(STORAGE_PATH, datePath);
  const filePath = path.join(dirPath, filename);
  
  await ensureDir(dirPath);
  await fs.writeFile(filePath, file.buffer);

  return {
    filename,
    storagePath: `${datePath}/${filename}`,
    size: file.size,
  };
}

/**
 * Get a file by storage path
 */
export async function getFile(storagePath: string): Promise<Buffer> {
  const filePath = path.join(STORAGE_PATH, storagePath);
  return fs.readFile(filePath);
}

/**
 * Create a read stream for a file
 */
export function createReadStream(storagePath: string) {
  const { createReadStream: fsCreateReadStream } = require('fs');
  const filePath = path.join(STORAGE_PATH, storagePath);
  return fsCreateReadStream(filePath);
}

/**
 * Delete a file
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const filePath = path.join(STORAGE_PATH, storagePath);
  await fs.unlink(filePath);
}

/**
 * Check if file exists
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  const filePath = path.join(STORAGE_PATH, storagePath);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
