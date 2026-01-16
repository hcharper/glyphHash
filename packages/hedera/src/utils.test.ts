/**
 * Utility Functions Tests
 * =======================
 */

import {
  createHash,
  createFileHash,
  verifyHash,
  generateId,
  parseHederaTimestamp,
  toHederaTimestamp,
  encodeBase64,
  decodeBase64,
} from './utils';

describe('Utils', () => {
  describe('createHash', () => {
    it('should create consistent SHA-256 hash for same input', () => {
      const hash1 = createHash('test input');
      const hash2 = createHash('test input');
      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different inputs', () => {
      const hash1 = createHash('input 1');
      const hash2 = createHash('input 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 64 character hex string', () => {
      const hash = createHash('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce known hash for known input', () => {
      // SHA-256 of "hello" is well-known
      const hash = createHash('hello');
      expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });
  });

  describe('createFileHash', () => {
    it('should create hash from buffer', () => {
      const buffer = Buffer.from('file content');
      const hash = createFileHash(buffer);
      expect(hash).toHaveLength(64);
    });

    it('should produce same hash as string hash for same content', () => {
      const content = 'same content';
      const stringHash = createHash(content);
      const bufferHash = createFileHash(Buffer.from(content));
      expect(stringHash).toBe(bufferHash);
    });
  });

  describe('verifyHash', () => {
    it('should return true for matching string hash', () => {
      const input = 'test input';
      const hash = createHash(input);
      expect(verifyHash(input, hash)).toBe(true);
    });

    it('should return false for non-matching hash', () => {
      const input = 'test input';
      const wrongHash = 'wronghash123';
      expect(verifyHash(input, wrongHash)).toBe(false);
    });

    it('should verify buffer hash', () => {
      const buffer = Buffer.from('test content');
      const hash = createFileHash(buffer);
      expect(verifyHash(buffer, hash)).toBe(true);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(1000);
    });

    it('should generate ID with expected format', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('parseHederaTimestamp', () => {
    it('should parse Hedera timestamp to Date', () => {
      const timestamp = '1704067200.000000000'; // 2024-01-01 00:00:00 UTC
      const date = parseHederaTimestamp(timestamp);
      expect(date.getTime()).toBe(1704067200000);
    });

    it('should handle nanoseconds', () => {
      const timestamp = '1704067200.500000000'; // + 500ms
      const date = parseHederaTimestamp(timestamp);
      expect(date.getTime()).toBe(1704067200500);
    });

    it('should handle timestamp without nanos', () => {
      const timestamp = '1704067200';
      const date = parseHederaTimestamp(timestamp);
      expect(date.getTime()).toBe(1704067200000);
    });
  });

  describe('toHederaTimestamp', () => {
    it('should convert Date to Hedera timestamp format', () => {
      const date = new Date(1704067200000);
      const timestamp = toHederaTimestamp(date);
      expect(timestamp).toBe('1704067200.000000000');
    });

    it('should preserve milliseconds', () => {
      const date = new Date(1704067200500);
      const timestamp = toHederaTimestamp(date);
      expect(timestamp).toBe('1704067200.500000000');
    });
  });

  describe('encodeBase64 / decodeBase64', () => {
    it('should encode and decode objects correctly', () => {
      const original = { foo: 'bar', num: 123 };
      const encoded = encodeBase64(original);
      const decoded = decodeBase64<typeof original>(encoded);
      expect(decoded).toEqual(original);
    });

    it('should return null for invalid base64', () => {
      const result = decodeBase64('not-valid!!!');
      expect(result).toBeNull();
    });

    it('should handle complex objects', () => {
      const original = {
        nested: { deep: { value: true } },
        array: [1, 2, 3],
        date: '2024-01-01',
      };
      const encoded = encodeBase64(original);
      const decoded = decodeBase64<typeof original>(encoded);
      expect(decoded).toEqual(original);
    });
  });
});
