/**
 * Utility Functions
 * =================
 * Common utilities for hashing and encoding
 */

import { createHash as cryptoCreateHash } from 'crypto';

/**
 * Create SHA-256 hash of input string
 */
export function createHash(input: string): string {
  return cryptoCreateHash('sha256').update(input).digest('hex');
}

/**
 * Create SHA-256 hash of a buffer (file content)
 */
export function createFileHash(buffer: Buffer): string {
  return cryptoCreateHash('sha256').update(buffer).digest('hex');
}

/**
 * Verify a hash matches the expected value
 */
export function verifyHash(input: string | Buffer, expectedHash: string): boolean {
  const actualHash = typeof input === 'string' ? createHash(input) : createFileHash(input);
  return actualHash === expectedHash;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Parse Hedera timestamp to Date
 * Hedera timestamps are in format: "seconds.nanoseconds"
 */
export function parseHederaTimestamp(timestamp: string): Date {
  const [seconds, nanos] = timestamp.split('.');
  const ms = parseInt(seconds) * 1000 + Math.floor(parseInt(nanos || '0') / 1_000_000);
  return new Date(ms);
}

/**
 * Format Date to Hedera timestamp
 */
export function toHederaTimestamp(date: Date): string {
  const seconds = Math.floor(date.getTime() / 1000);
  const nanos = (date.getTime() % 1000) * 1_000_000;
  return `${seconds}.${nanos.toString().padStart(9, '0')}`;
}

/**
 * Encode object to base64
 */
export function encodeBase64(data: object): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decode base64 to object
 */
export function decodeBase64<T>(encoded: string): T | null {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}
