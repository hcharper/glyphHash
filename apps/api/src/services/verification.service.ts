/**
 * Verification Service
 * ====================
 * Business logic for auditor verification workflows
 */

import prisma from '../lib/prisma.js';
import { getMirrorNodeService } from '../lib/hedera.js';
import { getFile } from '../lib/storage.js';
import { createFileHash } from '@glyphhash/hedera';
import { NotFoundError } from '../middleware/error-handler.js';
import type {
  VerificationResult,
  VerificationReport,
  VerificationStatus,
  DocumentCategory,
  HashMessage,
  DocumentHashPayload,
} from '@glyphhash/types';

interface VerifyBatchParams {
  topicId: string;
  startDate?: string;
  endDate?: string;
  categories?: DocumentCategory[];
}

interface ListReportsParams {
  topicId?: string;
  limit: number;
  offset: number;
}

class VerificationServiceImpl {
  /**
   * Verify a single document against Hedera
   */
  async verifyDocument(documentId: string): Promise<VerificationResult> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { topic: true },
    });

    if (!document) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    const result: VerificationResult = {
      documentId: document.id,
      filename: document.originalName,
      status: 'ERROR',
      storedHash: document.hash,
      verifiedAt: new Date(),
    };

    try {
      // 1. Re-compute hash from stored file
      const fileBuffer = await getFile(document.storagePath);
      const computedHash = createFileHash(fileBuffer);
      result.computedHash = computedHash;

      // 2. Check if computed hash matches stored hash
      if (computedHash !== document.hash) {
        result.status = 'MISMATCH';
        result.details = 'File hash does not match stored hash - file may have been modified';
        return result;
      }

      // 3. Look up hash on Hedera via mirror node
      const mirrorNode = getMirrorNodeService();
      const hederaResult = await mirrorNode.findDocumentHash(
        document.topic.topicId,
        document.id
      );

      if (!hederaResult) {
        result.status = 'NOT_FOUND';
        result.details = 'Document hash not found on Hedera blockchain';
        return result;
      }

      // 4. Verify hash matches what's on Hedera
      const payload = hederaResult.payload.payload as DocumentHashPayload;
      result.hederaHash = payload.hash;
      result.sequenceNumber = hederaResult.message.sequenceNumber;

      // Parse consensus timestamp (format: "seconds.nanos")
      if (hederaResult.message.consensusTimestamp) {
        const parts = hederaResult.message.consensusTimestamp.split('.');
        const seconds = parseInt(parts[0] || '0');
        const nanos = parseInt(parts[1] || '0');
        result.consensusTimestamp = new Date(
          seconds * 1000 + Math.floor(nanos / 1_000_000)
        );
      }

      if (payload.hash !== document.hash) {
        result.status = 'MISMATCH';
        result.details = 'Hedera hash does not match stored hash';
        return result;
      }

      // All checks passed
      result.status = 'VERIFIED';
      result.details = 'Document verified successfully against Hedera blockchain';
      return result;
    } catch (error) {
      result.status = 'ERROR';
      result.details = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  /**
   * Batch verify all documents in a topic
   */
  async verifyBatch(params: VerifyBatchParams): Promise<VerificationReport> {
    const { topicId, startDate, endDate, categories } = params;

    // Verify topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundError(`Topic not found: ${topicId}`);
    }

    // Build query filters
    const where: any = { topicId };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    if (categories && categories.length > 0) {
      where.category = { in: categories };
    }

    // Get all matching documents
    const documents = await prisma.document.findMany({
      where,
      include: { topic: true },
    });

    // Verify each document
    const results: VerificationResult[] = [];
    let verified = 0;
    let mismatches = 0;
    let notFound = 0;
    let errors = 0;

    for (const doc of documents) {
      const result = await this.verifyDocument(doc.id);
      results.push(result);

      switch (result.status) {
        case 'VERIFIED':
          verified++;
          break;
        case 'MISMATCH':
          mismatches++;
          break;
        case 'NOT_FOUND':
          notFound++;
          break;
        case 'ERROR':
          errors++;
          break;
      }
    }

    // Create report
    const report = await prisma.verificationReport.create({
      data: {
        topicId,
        totalDocuments: documents.length,
        verified,
        mismatches,
        notFound,
        errors,
        results: results as any,
      },
    });

    return this.mapReport(report);
  }

  /**
   * List verification reports
   */
  async listReports(params: ListReportsParams): Promise<VerificationReport[]> {
    const { topicId, limit, offset } = params;

    const where: any = {};
    if (topicId) where.topicId = topicId;

    const reports = await prisma.verificationReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return reports.map(this.mapReport);
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<VerificationReport> {
    const report = await prisma.verificationReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError(`Report not found: ${id}`);
    }

    return this.mapReport(report);
  }

  /**
   * Export report as PDF or CSV
   */
  async exportReport(
    id: string,
    format: 'pdf' | 'csv'
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const report = await this.getReportById(id);

    if (format === 'csv') {
      const csv = this.generateCSV(report);
      return {
        buffer: Buffer.from(csv),
        filename: `verification-report-${id}.csv`,
        mimeType: 'text/csv',
      };
    }

    // TODO: Implement PDF generation
    // For now, return JSON as a placeholder
    const json = JSON.stringify(report, null, 2);
    return {
      buffer: Buffer.from(json),
      filename: `verification-report-${id}.json`,
      mimeType: 'application/json',
    };
  }

  /**
   * Generate CSV from report
   */
  private generateCSV(report: VerificationReport): string {
    const headers = [
      'Document ID',
      'Filename',
      'Status',
      'Stored Hash',
      'Computed Hash',
      'Hedera Hash',
      'Consensus Timestamp',
      'Sequence Number',
      'Details',
    ];

    const rows = report.results.map((r) => [
      r.documentId,
      r.filename,
      r.status,
      r.storedHash,
      r.computedHash || '',
      r.hederaHash || '',
      r.consensusTimestamp?.toISOString() || '',
      r.sequenceNumber?.toString() || '',
      r.details || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Map Prisma model to API type
   */
  private mapReport(report: any): VerificationReport {
    return {
      id: report.id,
      topicId: report.topicId,
      totalDocuments: report.totalDocuments,
      verified: report.verified,
      mismatches: report.mismatches,
      notFound: report.notFound,
      errors: report.errors,
      results: report.results,
      generatedAt: report.createdAt,
      generatedBy: report.generatedBy,
    };
  }
}

export const verificationService = new VerificationServiceImpl();
