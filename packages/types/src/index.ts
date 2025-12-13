export interface Tenant {
  id: string;
  name: string;
  slug: string;
  clerkOrgId: string;
  sphereId: string | null;
  hcsTopicId: string | null;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum TenantStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export interface User {
  id: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface ComplianceLog {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  description: string;
  category: ComplianceCategory;
  severity: ComplianceSeverity;
  evidenceUrl: string | null;
  evidenceHash: string | null;
  encryptionMetadata: EncryptionMetadata | null;
  hcsMessageId: string | null;
  hcsSequenceNumber: string | null;
  hcsConsensusTimestamp: string | null;
  status: LogStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ComplianceCategory {
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  DATA_PROTECTION = 'DATA_PROTECTION',
  INCIDENT_RESPONSE = 'INCIDENT_RESPONSE',
  CHANGE_MANAGEMENT = 'CHANGE_MANAGEMENT',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  SECURITY_MONITORING = 'SECURITY_MONITORING',
  VENDOR_MANAGEMENT = 'VENDOR_MANAGEMENT',
  POLICY_COMPLIANCE = 'POLICY_COMPLIANCE',
}

export enum ComplianceSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum LogStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export interface EncryptionMetadata {
  algorithm: string;
  iv: string;
  keyId: string;
  encryptedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  complianceLogId: string;
  amount: string;
  tokenId: string;
  transactionId: string | null;
  status: PaymentStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface HederaSphere {
  id: string;
  name: string;
  description: string;
  networkType: 'mainnet' | 'testnet' | 'private';
  isPermissioned: boolean;
  createdAt: Date;
}

export interface HCSMessage {
  topicId: string;
  message: string;
  sequenceNumber: string;
  consensusTimestamp: string;
  runningHash: string;
  contents: any;
}

// API Request/Response types
export interface CreateTenantRequest {
  name: string;
  slug: string;
  clerkOrgId: string;
}

export interface CreateComplianceLogRequest {
  title: string;
  description: string;
  category: ComplianceCategory;
  severity: ComplianceSeverity;
  evidence?: File;
  metadata?: Record<string, any>;
}

export interface CreateComplianceLogResponse {
  log: ComplianceLog;
  uploadUrl?: string;
  encryptionKey?: string;
}

export interface DashboardStats {
  totalLogs: number;
  confirmedLogs: number;
  pendingLogs: number;
  totalPayments: string;
  logsByCategory: Record<ComplianceCategory, number>;
  recentLogs: ComplianceLog[];
}

export interface WebSocketEvent {
  type: 'LOG_CREATED' | 'LOG_CONFIRMED' | 'PAYMENT_COMPLETED';
  payload: any;
  tenantId: string;
  timestamp: string;
}
