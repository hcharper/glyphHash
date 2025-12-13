# 🔒 glyphHash Data Architecture & User Experience

## Overview: What Users Do vs What Goes On-Chain

**TL;DR:** Users upload evidence files (PDFs, screenshots, logs) + compliance metadata → Files encrypted & stored in S3 → **Only the cryptographic hash** goes on Hedera blockchain for immutability proof.

---

## 📝 Client-Side User Flow

### 1. User Creates Compliance Log

**What they input:**

```typescript
// Frontend form fields
{
  title: "Annual Security Audit - Q4 2025",
  description: "Completed penetration testing and vulnerability assessment",
  category: "SECURITY_MONITORING",  // Dropdown: Access Control, Data Protection, etc.
  severity: "HIGH",                  // LOW, MEDIUM, HIGH, CRITICAL
  evidenceFile: File                 // PDF, PNG, DOCX, CSV, etc.
}
```

**Example Use Cases:**

1. **SOC 2 Compliance:**
   - Title: "Employee Security Training - December 2025"
   - Description: "All employees completed annual security awareness training"
   - Category: `POLICY_COMPLIANCE`
   - Evidence: PDF with training completion certificates

2. **HIPAA Audit:**
   - Title: "Patient Data Access Log Review"
   - Description: "Quarterly review of PHI access logs, no anomalies detected"
   - Category: `ACCESS_CONTROL`
   - Evidence: CSV export of access logs

3. **ISO 27001:**
   - Title: "Incident Response Test"
   - Description: "Conducted tabletop exercise for ransomware scenario"
   - Category: `INCIDENT_RESPONSE`
   - Evidence: PDF report with findings and action items

4. **GDPR:**
   - Title: "Data Subject Access Request - Case #1234"
   - Description: "Processed user data deletion request within 30 days"
   - Category: `DATA_PROTECTION`
   - Evidence: Screenshots showing deletion confirmation

---

## 🔐 Client-Side Encryption Process

### Step 1: User Selects Evidence File

```typescript
// In the browser (apps/web/src/lib/crypto.ts)
const file = document.getElementById('evidence-upload').files[0];
// Example: "security-audit-report.pdf" (2.3 MB)
```

### Step 2: Generate Encryption Key

```typescript
// Generate random 256-bit AES key in browser
const encryptionKey = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// Export key for storage (user must save this!)
const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey);
const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
```

**Critical:** User receives this encryption key via secure download. They MUST save it to decrypt files later. This is **zero-knowledge** - we never see their key.

### Step 3: Encrypt File

```typescript
// Generate random 96-bit IV (initialization vector)
const iv = crypto.getRandomValues(new Uint8Array(12));

// Read file as ArrayBuffer
const fileData = await file.arrayBuffer();

// Encrypt with AES-256-GCM
const encryptedData = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  encryptionKey,
  fileData
);

// Combine IV + encrypted data
const encryptedFile = new Blob([iv, encryptedData]);
```

### Step 4: Generate Cryptographic Hash

```typescript
// SHA-256 hash of encrypted file
const hashBuffer = await crypto.subtle.digest('SHA-256', encryptedData);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const evidenceHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

// Result: "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a"
```

**This hash is what goes on-chain!**

---

## ☁️ Storage: What Goes Where

### Off-Chain Storage (S3/LocalStack)

**What's stored:**
- ✅ Encrypted evidence file
- ✅ Original filename (metadata only)
- ✅ File size
- ✅ Upload timestamp

**Example S3 object:**
```
Bucket: glyphhash-evidence
Key: tenant-abc123/evidence/a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a.enc
Size: 2,456,789 bytes
Content-Type: application/octet-stream
Metadata:
  - original-filename: security-audit-report.pdf
  - encryption-algorithm: AES-256-GCM
  - uploaded-at: 2025-12-12T01:23:45.678Z
```

**Security:**
- File is already encrypted client-side
- Even if S3 is breached, files are useless without user's key
- S3 access requires AWS credentials (not exposed to client)

---

### On-Chain Storage (Hedera HCS)

**What goes on Hedera blockchain:**

```json
{
  "type": "COMPLIANCE_LOG",
  "logId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "abc123",
  "category": "SECURITY_MONITORING",
  "severity": "HIGH",
  "timestamp": "2025-12-12T01:23:45.678Z",
  "evidenceHash": "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
  "metadata": {
    "title": "Annual Security Audit - Q4 2025",
    "description": "Completed penetration testing and vulnerability assessment"
  }
}
```

**What's NOT on-chain:**
- ❌ Actual file contents
- ❌ Encryption keys
- ❌ User PII
- ❌ Sensitive compliance details

**Why HCS?**
- **Immutable:** Message can never be deleted or modified
- **Timestamped:** Consensus timestamp proves when it was recorded
- **Verifiable:** Anyone can query the topic and verify the hash
- **Cheap:** ~$0.0001 per message (vs $1-5 on Ethereum)
- **Fast:** 3-5 second finality

---

### Database Storage (PostgreSQL)

**ComplianceLog table:**
```sql
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  tenantId: "abc123",
  userId: "user-456",
  title: "Annual Security Audit - Q4 2025",
  description: "Completed penetration testing...",
  category: "SECURITY_MONITORING",
  severity: "HIGH",
  evidenceUrl: "s3://glyphhash-evidence/tenant-abc123/evidence/a7ffc6...",
  evidenceHash: "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
  encryptionMetadata: {
    "algorithm": "AES-256-GCM",
    "ivLength": 12,
    "keyId": "user-generated-client-side"
  },
  hcsMessageId: "0.0.123456@1734000225.678901234",
  hcsSequenceNumber: "42",
  hcsConsensusTimestamp: "1734000225.678901234",
  status: "CONFIRMED",  // DRAFT → PENDING → CONFIRMED
  createdAt: "2025-12-12T01:23:45.678Z",
  updatedAt: "2025-12-12T01:23:55.123Z"
}
```

**Purpose:**
- Fast queries (don't query blockchain for every list)
- User-friendly search and filtering
- Store additional metadata not suitable for blockchain
- Track confirmation status

---

## 🔄 Complete Data Flow

### Phase 1: Client-Side Preparation

```
User Browser
│
├─ 1. User fills form + selects PDF
│
├─ 2. Generate AES-256 key (WebCrypto API)
│
├─ 3. Encrypt file in browser
│     └─ plaintext.pdf (2.3 MB) → encrypted.enc (2.3 MB)
│
├─ 4. Calculate SHA-256 hash of encrypted file
│     └─ "a7ffc6f8bf1ed76651c14756a061d662..."
│
└─ 5. Download encryption key to user's device
      └─ encryption-key-550e8400.txt
```

### Phase 2: Upload to Backend

```
POST /compliance-logs
{
  "title": "Annual Security Audit",
  "description": "...",
  "category": "SECURITY_MONITORING",
  "severity": "HIGH",
  "evidenceHash": "a7ffc6f8bf1ed76651c14756a061d662...",
  "encryptionMetadata": { "algorithm": "AES-256-GCM", ... }
}

Backend Response:
{
  "logId": "550e8400-e29b-41d4-a716-446655440000",
  "uploadUrl": "https://s3.amazonaws.com/glyphhash-evidence/..."  // Pre-signed URL
}
```

### Phase 3: Upload Encrypted File to S3

```
Client
│
└─ PUT to pre-signed URL
   └─ Uploads encrypted.enc directly to S3
   └─ Backend never sees the file!
```

### Phase 4: Submit to Hedera HCS

```
User clicks "Submit to Blockchain"
│
└─ POST /compliance-logs/:id/submit

Backend:
│
├─ 1. Create HCS message payload
│     {
│       "type": "COMPLIANCE_LOG",
│       "logId": "550e8400...",
│       "evidenceHash": "a7ffc6...",
│       ...
│     }
│
├─ 2. Submit to Hedera topic (0.0.123456)
│     └─ TopicMessageSubmitTransaction
│
├─ 3. Get transaction receipt
│     └─ Sequence number: 42
│     └─ Transaction ID: 0.0.12345@1734000225.678
│
└─ 4. Update database
      └─ status: PENDING
      └─ hcsMessageId: "0.0.123456@1734000225.678901234"
```

### Phase 5: Background Confirmation (Worker)

```
Worker Service (apps/api/src/worker.ts)
│
├─ Every 10 seconds:
│   └─ Query Mirror Node REST API
│       https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.123456/messages
│
├─ For each new message:
│   ├─ Parse message content
│   ├─ Extract logId
│   ├─ Update database:
│   │   └─ status: CONFIRMED
│   │   └─ hcsConsensusTimestamp: "1734000225.678901234"
│   │   └─ hcsSequenceNumber: "42"
│   │
│   └─ Publish Redis event
│       └─ "log:confirmed:550e8400..."
│
└─ Frontend receives update (SSE/polling)
    └─ Shows green checkmark ✅
```

---

## 🎨 Frontend User Interface

### Dashboard View

```
┌─────────────────────────────────────────────────────────┐
│  glyphHash - Compliance Dashboard                       │
├─────────────────────────────────────────────────────────┤
│  📊 Statistics                                          │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │ 156 Logs │ 142 ✅   │ 14 ⏳    │ 5 USDC   │         │
│  │ Total    │ Confirmed│ Pending  │ Paid     │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
│                                                          │
│  📋 Recent Compliance Logs                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ✅ Annual Security Audit - Q4 2025                 │ │
│  │    SECURITY_MONITORING • HIGH                      │ │
│  │    📎 evidence.pdf • 🔗 Topic 0.0.123456 #42      │ │
│  │    ⏰ Confirmed: Dec 12, 2025 1:23:55 AM          │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ ⏳ Employee Training - December 2025              │ │
│  │    POLICY_COMPLIANCE • MEDIUM                      │ │
│  │    📎 certificates.pdf • Submitting to HCS...     │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Create Log Form

```
┌─────────────────────────────────────────────────────────┐
│  📝 New Compliance Log                                  │
├─────────────────────────────────────────────────────────┤
│  Title*                                                  │
│  [Annual Security Audit - Q4 2025               ]      │
│                                                          │
│  Description*                                            │
│  [Completed penetration testing and            ]       │
│  [vulnerability assessment per ISO 27001       ]       │
│                                                          │
│  Category*                    Severity*                  │
│  [Security Monitoring ▼]     [High ▼]                   │
│                                                          │
│  Evidence File                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📎 security-audit-report.pdf (2.3 MB)          │   │
│  │  [Remove]                                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  🔒 Client-Side Encryption                              │
│  ✅ File will be encrypted in your browser              │
│  ✅ You will receive the encryption key                 │
│  ⚠️  Save the key! We cannot recover it.               │
│                                                          │
│  [Cancel]                     [Create & Submit to HCS]  │
└─────────────────────────────────────────────────────────┘
```

### After Submission

```
┌─────────────────────────────────────────────────────────┐
│  ✅ Log Created Successfully!                           │
├─────────────────────────────────────────────────────────┤
│  Your compliance log is being submitted to Hedera...    │
│                                                          │
│  📥 Download Your Encryption Key                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  🔑 encryption-key-550e8400.txt                  │   │
│  │  [Download Key]                                  │   │
│  │                                                  │   │
│  │  ⚠️  IMPORTANT: Save this file securely!        │   │
│  │  You need it to decrypt your evidence later.    │   │
│  │  We do NOT store this key.                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  🔗 Hedera Transaction                                  │
│  Topic: 0.0.123456                                       │
│  Status: ⏳ Waiting for confirmation...                 │
│  Expected: ~5 seconds                                    │
│                                                          │
│  [View on HashScan]              [Go to Dashboard]      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Verification Process

### For Auditors

**Scenario:** External auditor needs to verify a compliance log

1. **View Log Details:**
   ```
   Title: Annual Security Audit - Q4 2025
   HCS Topic: 0.0.123456
   Sequence Number: 42
   Consensus Timestamp: 1734000225.678901234
   Evidence Hash: a7ffc6f8bf1ed76651c14756a061d662...
   ```

2. **Verify on Hedera:**
   - Visit HashScan: https://hashscan.io/testnet/topic/0.0.123456/message/42
   - See the exact message submitted
   - Confirm consensus timestamp
   - Verify evidence hash matches

3. **Download Evidence (if user provides key):**
   ```typescript
   // User shares: encryption-key-550e8400.txt
   const decryptedFile = await decryptEvidence(
     encryptedBlob,
     encryptionKey
   );
   
   // Calculate hash
   const hash = await calculateSHA256(encryptedBlob);
   
   // Verify: hash === "a7ffc6f8bf1ed76651c14756a061d662..."
   // ✅ File is authentic and unmodified!
   ```

4. **Chain of Trust:**
   - Hash on blockchain is immutable
   - Consensus timestamp proves when it was recorded
   - File hash can be recalculated and verified
   - Any tampering would change the hash

---

## 🔒 Security Model

### Zero-Knowledge Architecture

```
┌─────────────┐
│   User      │ ← Has encryption key
└──────┬──────┘
       │
       │ Encrypts file locally
       ↓
┌─────────────┐
│  Browser    │ ← Generates key, encrypts, calculates hash
└──────┬──────┘
       │
       │ Uploads encrypted file
       ↓
┌─────────────┐
│     S3      │ ← Stores encrypted blob (can't decrypt)
└─────────────┘
       │
       │ Hash only
       ↓
┌─────────────┐
│  Database   │ ← Stores metadata + hash
└──────┬──────┘
       │
       │ Hash only
       ↓
┌─────────────┐
│   Hedera    │ ← Immutable record of hash
└─────────────┘

Nobody except the user can decrypt the files!
```

### Attack Scenarios

**Q: What if S3 is breached?**
A: Files are already encrypted. Useless without keys.

**Q: What if database is breached?**
A: Hashes are public anyway. No encryption keys stored.

**Q: What if user loses encryption key?**
A: File is permanently unrecoverable. This is by design (zero-knowledge).

**Q: What if someone modifies the file in S3?**
A: Hash verification will fail. Blockchain hash is immutable proof.

**Q: What if glyphHash goes offline?**
A: Blockchain record persists forever. Users have their keys and can verify independently.

---

## 📦 Supported Evidence Types

- **Documents:** PDF, DOCX, TXT, MD
- **Spreadsheets:** XLSX, CSV
- **Images:** PNG, JPG, JPEG
- **Logs:** LOG, JSON, XML
- **Archives:** ZIP (up to 50 MB)

**File size limit:** 50 MB per evidence file

---

## 💡 Example: SOC 2 Audit Trail

```
January 2025:
├─ Access Control Review
│  └─ evidence: user-access-report-q1.xlsx (hash: abc123...)
├─ Backup Verification
│  └─ evidence: backup-test-results.pdf (hash: def456...)
└─ Security Training
   └─ evidence: training-certificates.pdf (hash: ghi789...)

February 2025:
├─ Incident Response Test
│  └─ evidence: tabletop-exercise-report.pdf
└─ Vendor Risk Assessment
   └─ evidence: vendor-security-questionnaire.xlsx

... continues monthly ...

All hashes recorded on Hedera topic 0.0.123456
All files encrypted and stored in S3
All metadata queryable in database
Complete audit trail with immutable timestamps!
```

---

## 🚀 Benefits

1. **Immutable Proof:** Blockchain timestamp can't be faked
2. **Privacy:** Files encrypted, keys never leave user's device
3. **Cost-Effective:** Store large files off-chain, only hash on-chain
4. **Fast:** 3-5 second finality vs 15+ minutes on Ethereum
5. **Verifiable:** Anyone can verify the hash on HashScan
6. **Compliant:** Meets SOC 2, ISO 27001, HIPAA requirements

This is the **best of both worlds**: blockchain immutability + practical storage!
