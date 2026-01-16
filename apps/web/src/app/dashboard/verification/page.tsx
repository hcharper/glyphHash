'use client';

import { useState, useCallback } from 'react';
import { 
  Shield, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText,
  Hash,
  ExternalLink,
  Clock,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { computeFileHash, formatBytes } from '@/lib/utils';

interface VerificationResult {
  documentId: string;
  filename: string;
  status: 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND' | 'ERROR';
  storedHash: string;
  computedHash?: string;
  hederaHash?: string;
  consensusTimestamp?: string;
  details?: string;
}

interface BatchResult {
  id: string;
  topicId: string;
  totalDocuments: number;
  verified: number;
  mismatches: number;
  notFound: number;
  errors: number;
  results: Array<{
    documentId: string;
    filename: string;
    status: string;
    details?: string;
  }>;
}

export default function VerificationPage() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      const hash = await computeFileHash(droppedFile);
      setFileHash(hash);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const hash = await computeFileHash(selectedFile);
      setFileHash(hash);
    }
  };

  const handleVerifyById = async () => {
    if (!documentId.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const verificationResult = await api.verifyDocument(documentId);
      setResult(verificationResult);
    } catch (error) {
      setResult({
        documentId,
        filename: 'Unknown',
        status: 'ERROR',
        storedHash: '',
        details: error instanceof Error ? error.message : 'Verification failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const getHashScanUrl = (timestamp?: string) => {
    if (!timestamp) return null;
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    return `https://hashscan.io/${network}/transaction/${timestamp}`;
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return {
          icon: <CheckCircle2 className="w-16 h-16" />,
          color: 'text-green-400',
          bg: 'bg-green-900/30',
          border: 'border-green-700',
          title: 'Verified',
          description: 'Document hash matches the blockchain record',
        };
      case 'MISMATCH':
        return {
          icon: <XCircle className="w-16 h-16" />,
          color: 'text-red-400',
          bg: 'bg-red-900/30',
          border: 'border-red-700',
          title: 'Hash Mismatch',
          description: 'Document has been modified since it was recorded',
        };
      case 'NOT_FOUND':
        return {
          icon: <AlertCircle className="w-16 h-16" />,
          color: 'text-yellow-400',
          bg: 'bg-yellow-900/30',
          border: 'border-yellow-700',
          title: 'Not Found',
          description: 'No matching record found on the blockchain',
        };
      default:
        return {
          icon: <AlertCircle className="w-16 h-16" />,
          color: 'text-red-400',
          bg: 'bg-red-900/30',
          border: 'border-red-700',
          title: 'Error',
          description: 'An error occurred during verification',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-carbon-100">Document Verification</h1>
        <p className="text-carbon-400">Verify document authenticity against the Hedera blockchain</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-carbon-900 rounded-lg w-fit border border-carbon-800">
        <button
          onClick={() => { setMode('single'); setResult(null); setBatchResult(null); }}
          className={`px-4 py-2 rounded-md font-medium transition ${
            mode === 'single' 
              ? 'bg-carbon-700 text-carbon-100' 
              : 'text-carbon-400 hover:text-carbon-200'
          }`}
        >
          Single Document
        </button>
        <button
          onClick={() => { setMode('batch'); setResult(null); setBatchResult(null); }}
          className={`px-4 py-2 rounded-md font-medium transition ${
            mode === 'batch' 
              ? 'bg-carbon-700 text-carbon-100' 
              : 'text-carbon-400 hover:text-carbon-200'
          }`}
        >
          Batch Verification
        </button>
      </div>

      {mode === 'single' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Verification Input */}
          <div className="bg-carbon-900 rounded-xl border border-carbon-800 p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-carbon-100 mb-4">Verify by Document ID</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Enter document ID..."
                  className="flex-1 px-4 py-2 bg-carbon-800 border border-carbon-700 text-carbon-100 placeholder-carbon-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-500"
                />
                <button
                  onClick={handleVerifyById}
                  disabled={loading || !documentId.trim()}
                  className="px-4 py-2 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Verify
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-carbon-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-carbon-900 text-carbon-500">or</span>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-carbon-100 mb-4">Verify by File Upload</h2>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                  dragActive 
                    ? 'border-crimson-500 bg-crimson-900/10' 
                    : 'border-carbon-700 hover:border-carbon-600'
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 text-carbon-500 mx-auto mb-3" />
                  <p className="text-carbon-300 font-medium">
                    {file ? file.name : 'Drop a file or click to upload'}
                  </p>
                  <p className="text-carbon-500 text-sm mt-1">
                    {file ? formatBytes(file.size) : 'We\'ll compute the hash and verify'}
                  </p>
                </label>
              </div>

              {fileHash && (
                <div className="mt-4 p-4 bg-carbon-800 rounded-lg">
                  <div className="flex items-center gap-2 text-carbon-400 text-sm mb-2">
                    <Hash className="w-4 h-4" />
                    Computed SHA-256 Hash:
                  </div>
                  <code className="text-xs text-carbon-300 font-mono break-all">{fileHash}</code>
                </div>
              )}
            </div>
          </div>

          {/* Verification Result */}
          <div className="bg-carbon-900 rounded-xl border border-carbon-800 p-6">
            <h2 className="font-semibold text-carbon-100 mb-4">Verification Result</h2>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-crimson-500 animate-spin mb-4" />
                <p className="text-carbon-400">Verifying against blockchain...</p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`rounded-xl p-6 border ${getStatusDisplay(result.status).bg} ${getStatusDisplay(result.status).border}`}>
                  <div className="flex items-center gap-4">
                    <div className={getStatusDisplay(result.status).color}>
                      {getStatusDisplay(result.status).icon}
                    </div>
                    <div>
                      <h3 className={`text-2xl font-bold ${getStatusDisplay(result.status).color}`}>
                        {getStatusDisplay(result.status).title}
                      </h3>
                      <p className="text-carbon-400">{getStatusDisplay(result.status).description}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-carbon-500 mt-0.5" />
                    <div>
                      <p className="text-carbon-500 text-sm">Filename</p>
                      <p className="text-carbon-200 font-medium">{result.filename}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Hash className="w-5 h-5 text-carbon-500 mt-0.5" />
                    <div>
                      <p className="text-carbon-500 text-sm">Stored Hash</p>
                      <code className="text-xs text-carbon-300 font-mono break-all">{result.storedHash || 'N/A'}</code>
                    </div>
                  </div>

                  {result.consensusTimestamp && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-carbon-500 mt-0.5" />
                      <div>
                        <p className="text-carbon-500 text-sm">Consensus Timestamp</p>
                        <p className="text-carbon-200">{new Date(result.consensusTimestamp).toLocaleString()}</p>
                        {getHashScanUrl(result.consensusTimestamp) && (
                          <a
                            href={getHashScanUrl(result.consensusTimestamp)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 mt-1"
                          >
                            View on HashScan <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {result.details && (
                    <div className="p-3 bg-carbon-800 rounded-lg">
                      <p className="text-carbon-400 text-sm">{result.details}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-16 h-16 text-carbon-700 mb-4" />
                <p className="text-carbon-400">Enter a document ID or upload a file to verify</p>
                <p className="text-carbon-500 text-sm mt-2">
                  We&apos;ll check the hash against the Hedera blockchain
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'batch' && (
        <div className="bg-carbon-900 rounded-xl border border-carbon-800 p-6">
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-carbon-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-200 mb-2">Batch Verification</h3>
            <p className="text-carbon-400 max-w-md mx-auto">
              Verify all documents in a topic at once. Select a topic and date range to start.
            </p>
            <p className="text-carbon-500 text-sm mt-4">Coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}
