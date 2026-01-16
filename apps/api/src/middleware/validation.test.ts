/**
 * Validation Middleware Tests
 * ===========================
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateQuery, validateParams } from './validation';
import { ValidationError } from './error-handler';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe('validate (body)', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    it('should parse valid body and call next', () => {
      mockRequest.body = { name: 'Test', email: 'test@example.com' };

      validate(schema)(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({ name: 'Test', email: 'test@example.com' });
    });

    it('should throw ValidationError for invalid body', () => {
      mockRequest.body = { name: '', email: 'invalid-email' };

      expect(() => {
        validate(schema)(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow(ValidationError);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for missing required fields', () => {
      mockRequest.body = {};

      expect(() => {
        validate(schema)(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow(ValidationError);
    });

    it('should re-throw non-Zod errors', () => {
      const badSchema = {
        parse: () => {
          throw new Error('Non-Zod error');
        },
      };

      mockRequest.body = {};

      expect(() => {
        validate(badSchema as any)(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow('Non-Zod error');
    });
  });

  describe('validateQuery', () => {
    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    it('should parse valid query and call next', () => {
      mockRequest.query = { page: '1', limit: '10' };

      validateQuery(schema)(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid query', () => {
      const strictSchema = z.object({
        page: z.string().regex(/^\d+$/),
      });

      mockRequest.query = { page: 'not-a-number' };

      expect(() => {
        validateQuery(strictSchema)(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow(ValidationError);
    });
  });

  describe('validateParams', () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    it('should parse valid params and call next', () => {
      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      validateParams(schema)(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid params', () => {
      mockRequest.params = { id: 'not-a-uuid' };

      expect(() => {
        validateParams(schema)(mockRequest as Request, mockResponse as Response, nextFunction);
      }).toThrow(ValidationError);
    });
  });
});
