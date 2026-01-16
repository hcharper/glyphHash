/**
 * GlyphHash Shared Types
 * ======================
 * Core type definitions shared across all services
 */

// ===========================================
// Topic Types
// ===========================================

export interface Topic {
  id: string;
  topicId: string; // Hedera topic ID (e.g., "0.0.123456")
  name: string;
  description?: string;
  ownerId: string;
  companyIdentifier: string;
  bindingHash: string; // Hash of companyId + topicId (first message)
  bindingTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTopicRequest {
  name: string;
  description?: string;
  companyIdentifier: string;
}

export interface CreateTopicResponse {
  topic: Topic;
  transactionId: string;
  consensusTimestamp?: string;
}

// ===========================================
// Document Types
// ===========================================

export type DocumentCategory =
  | 'SECURITY_MONITORING'
  | 'ACCESS_CONTROL'
  | 'INCIDENT_RESPONSE'
  | 'CHANGE_MANAGEMENT'
  | 'RISK_ASSESSMENT'
  | 'COMPLIANCE_AUDIT'
  | 'POLICY_DOCUMENT'
  | 'EVIDENCE'
  | 'OTHER';

export type DocumentStatus =
  | 'PENDING'      // Uploaded, not yet hashed
  | 'SUBMITTED'    // Hash submitted to Hedera
  | 'CONFIRMED'    // Consensus timestamp received
  | 'FAILED';      // Submission failed

export interface Document {
  id: string;
  topicId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  description?: string;
  hash: string; // SHA-256 hash of file content
  storagePath: string;
  status: DocumentStatus;
  sequenceNumber?: number;
  consensusTimestamp?: Date;
  transactionId?: string;
  metadata?: Record<string, unknown>;
  version: number;
  previousVersionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadDocumentRequest {
  topicId: string;
  category: DocumentCategory;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadDocumentResponse {
  document: Document;
  transactionId: string;
}

// ===========================================
// Hash Message Types (Hedera HCS)
// ===========================================

export type HashMessageType = 'TOPIC_BINDING' | 'DOCUMENT_HASH' | 'VERSION_LINK';

export interface HashMessage {
  type: HashMessageType;
  version: string; // Schema version (e.g., "1.0")
  timestamp: string; // ISO 8601
  payload: TopicBindingPayload | DocumentHashPayload | VersionLinkPayload;
}

export interface TopicBindingPayload {
  companyIdentifier: string;
  topicId: string;
  bindingHash: string;
}

export interface DocumentHashPayload {
  documentId: string;
  hash: string;
  filenameHash: string; // SHA-256 hash of filename for privacy
  category: DocumentCategory;
  size: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export interface VersionLinkPayload {
  documentId: string;
  hash: string;
  previousDocumentId: string;
  previousHash: string;
  version: number;
}

// ===========================================
// Verification Types
// ===========================================

export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND' | 'ERROR';

export interface VerificationResult {
  documentId: string;
  filename: string;
  status: VerificationStatus;
  storedHash: string;
  computedHash?: string;
  hederaHash?: string;
  consensusTimestamp?: Date;
  sequenceNumber?: number;
  details?: string;
  verifiedAt: Date;
}

export interface VerificationReport {
  id: string;
  topicId: string;
  totalDocuments: number;
  verified: number;
  mismatches: number;
  notFound: number;
  errors: number;
  results: VerificationResult[];
  generatedAt: Date;
  generatedBy?: string;
}

export interface VerifyDocumentRequest {
  documentId: string;
}

export interface VerifyBatchRequest {
  topicId: string;
  startDate?: string;
  endDate?: string;
  categories?: DocumentCategory[];
}

// ===========================================
// Hedera Mirror Node Types
// ===========================================

export interface HederaMessage {
  consensusTimestamp: string;
  sequenceNumber: number;
  message: string; // Base64 encoded
  topicId: string;
  transactionId?: string;
}

export interface MirrorNodeMessagesResponse {
  messages: HederaMessage[];
  links?: {
    next?: string;
  };
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ===========================================
// Event Types (for real-time updates)
// ===========================================

export type EventType =
  | 'TOPIC_CREATED'
  | 'DOCUMENT_UPLOADED'
  | 'HASH_SUBMITTED'
  | 'HASH_CONFIRMED'
  | 'VERIFICATION_COMPLETE';

export interface GlyphHashEvent {
  type: EventType;
  timestamp: string;
  payload: unknown;
}

// ===========================================
// User Types (Future - Auth)
// ===========================================

export type UserRole = 'ADMIN' | 'USER' | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Utility Types
// ===========================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Timestamps = {
  createdAt: Date;
  updatedAt: Date;
};
