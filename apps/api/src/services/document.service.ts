/**
 * Document Service
 * ================
 * Business logic for document upload and hash submission
 */

import { Readable } from 'stream';
import prisma from '../lib/prisma.js';
import { getTopicService } from '../lib/hedera.js';
import { storeFile, getFile, createReadStream, StorageFile } from '../lib/storage.js';
import { createFileHash } from '@glyphhash/hedera';
import { NotFoundError, HederaError, ValidationError } from '../middleware/error-handler.js';
import type { Document, DocumentCategory, UploadDocumentResponse } from '@glyphhash/types';

interface UploadParams {
  file: Express.Multer.File;
  topicId: string;
  category: DocumentCategory;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface ListParams {
  topicId?: string;
  category?: string;
  status?: string;
  limit: number;
  offset: number;
}

class DocumentServiceImpl {
  /**
   * Upload document, compute hash, and submit to Hedera
   */
  async uploadDocument(params: UploadParams): Promise<UploadDocumentResponse> {
    const { file, topicId, category, description, metadata } = params;

    // 1. Verify topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundError(`Topic not found: ${topicId}`);
    }

    // 2. Compute file hash
    const hash = createFileHash(file.buffer);

    // 3. Store file
    const stored = await storeFile({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // 4. Create document record (PENDING status)
    const document = await prisma.document.create({
      data: {
        topicId,
        filename: stored.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category,
        description,
        hash,
        storagePath: stored.storagePath,
        status: 'PENDING',
        metadata: metadata as any,
      },
    });

    // 5. Submit hash to Hedera
    try {
      const hederaService = getTopicService();
      const result = await hederaService.submitDocumentHash(
        topic.topicId,
        document.id,
        hash,
        file.originalname,
        category,
        file.size,
        file.mimetype,
        metadata
      );

      // 6. Update document with transaction info
      const updated = await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'SUBMITTED',
          transactionId: result.transactionId,
          sequenceNumber: result.sequenceNumber,
          consensusTimestamp: result.consensusTimestamp
            ? new Date(result.consensusTimestamp)
            : null,
        },
      });

      return {
        document: this.mapDocument(updated),
        transactionId: result.transactionId,
      };
    } catch (error) {
      // Mark document as failed
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED' },
      });

      if (error instanceof Error) {
        throw new HederaError(`Failed to submit hash: ${error.message}`, error);
      }
      throw error;
    }
  }

  /**
   * List documents with filtering
   */
  async listDocuments(params: ListParams): Promise<any[]> {
    const { topicId, category, status, limit, offset } = params;

    const where: any = {};
    if (topicId) where.topicId = topicId;
    if (category) where.category = category;
    if (status) where.status = status;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            topicId: true,
          },
        },
      },
    });

    return documents.map((doc) => ({
      ...this.mapDocument(doc),
      topic: doc.topic,
    }));
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: string): Promise<Document> {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundError(`Document not found: ${id}`);
    }

    return this.mapDocument(document);
  }

  /**
   * Download document file
   */
  async downloadDocument(id: string): Promise<{ stream: Readable; document: Document }> {
    const document = await this.getDocumentById(id);
    const stream = createReadStream(document.storagePath);
    
    return { stream, document };
  }

  /**
   * Update document status (used by worker)
   */
  async updateDocumentStatus(
    id: string,
    status: 'CONFIRMED' | 'FAILED',
    consensusTimestamp?: Date
  ): Promise<Document> {
    const document = await prisma.document.update({
      where: { id },
      data: {
        status,
        ...(consensusTimestamp && { consensusTimestamp }),
      },
    });

    return this.mapDocument(document);
  }

  /**
   * Delete a document
   * Note: This only removes the document from our database and storage
   * The hash record on Hedera is immutable and will remain
   */
  async deleteDocument(id: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundError(`Document not found: ${id}`);
    }

    // Delete from database
    await prisma.document.delete({
      where: { id },
    });

    // TODO: Delete from storage as well (optional, depending on retention policy)
  }

  /**
   * Map Prisma model to API type
   */
  private mapDocument(doc: any): Document {
    return {
      id: doc.id,
      topicId: doc.topicId,
      filename: doc.filename,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      category: doc.category,
      description: doc.description,
      hash: doc.hash,
      storagePath: doc.storagePath,
      status: doc.status,
      sequenceNumber: doc.sequenceNumber,
      consensusTimestamp: doc.consensusTimestamp,
      transactionId: doc.transactionId,
      metadata: doc.metadata,
      version: doc.version,
      previousVersionId: doc.previousVersionId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export const documentService = new DocumentServiceImpl();
