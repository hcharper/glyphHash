'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Upload, 
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Hash,
} from 'lucide-react';
import api from '@/lib/api';
import { formatBytes, computeFileHash, truncateHash } from '@/lib/utils';

interface Topic {
  id: string;
  name: string;
  topicId: string;
}

const CATEGORIES = [
  { value: 'SECURITY_MONITORING', label: 'Security Monitoring' },
  { value: 'ACCESS_CONTROL', label: 'Access Control' },
  { value: 'INCIDENT_RESPONSE', label: 'Incident Response' },
  { value: 'CHANGE_MANAGEMENT', label: 'Change Management' },
  { value: 'RISK_ASSESSMENT', label: 'Risk Assessment' },
  { value: 'COMPLIANCE_AUDIT', label: 'Compliance Audit' },
  { value: 'POLICY_DOCUMENT', label: 'Policy Document' },
  { value: 'EVIDENCE', label: 'Evidence' },
  { value: 'OTHER', label: 'Other' },
];

export default function UploadDocumentPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ hash: string; transactionId: string } | null>(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [topicId, setTopicId] = useState('');
  const [category, setCategory] = useState('EVIDENCE');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const data = await api.getTopics();
      setTopics(data);
      if (data.length > 0) {
        setTopicId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    
    try {
      const hash = await computeFileHash(file);
      setFileHash(hash);
    } catch (err) {
      setError('Failed to compute file hash');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileHash(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }
    
    if (!topicId) {
      setError('Please select a topic');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.uploadDocument({
        file: selectedFile,
        topicId,
        category,
        description: description.trim() || undefined,
      });

      setSuccess({
        hash: result.document.hash,
        transactionId: result.transactionId,
      });

      setTimeout(() => {
        router.push('/dashboard/documents');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTopics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crimson-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/documents"
          className="inline-flex items-center gap-2 text-carbon-400 hover:text-carbon-200 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </Link>
        <h1 className="font-display text-2xl font-bold text-carbon-100">Upload Document</h1>
        <p className="text-carbon-400 mt-1">
          Hash and submit a document to your Hedera topic for immutable timestamping
        </p>
      </div>

      {topics.length === 0 ? (
        <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-8 text-center">
          <Hash className="w-12 h-12 text-carbon-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-carbon-200 mb-2">No topics available</h3>
          <p className="text-carbon-400 mb-6">Create a topic first before uploading documents</p>
          <Link
            href="/dashboard/topics/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-medium transition"
          >
            Create Topic
          </Link>
        </div>
      ) : success ? (
        <div className="bg-carbon-900 border border-green-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-carbon-100 mb-2">Document Uploaded Successfully!</h2>
          <p className="text-carbon-400 mb-4">Your document hash has been submitted to Hedera</p>
          
          <div className="bg-carbon-800 rounded-lg p-4 text-left space-y-2">
            <div>
              <span className="text-carbon-500 text-sm">Document Hash:</span>
              <p className="text-violet-400 font-mono text-sm break-all">{success.hash}</p>
            </div>
            <div>
              <span className="text-carbon-500 text-sm">Transaction ID:</span>
              <p className="text-carbon-200 font-mono text-sm truncate">{success.transactionId}</p>
            </div>
          </div>
          
          <p className="text-carbon-500 text-sm mt-4">Redirecting to documents list...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-crimson-900/20 border border-crimson-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-crimson-400 flex-shrink-0" />
              <span className="text-crimson-300">{error}</span>
            </div>
          )}

          {/* File Upload */}
          <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-carbon-300 mb-4">
              Document File *
            </label>
            
            {selectedFile ? (
              <div className="bg-carbon-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-carbon-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-carbon-400" />
                    </div>
                    <div>
                      <p className="text-carbon-100 font-medium">{selectedFile.name}</p>
                      <p className="text-carbon-500 text-sm">{formatBytes(selectedFile.size)}</p>
                      {fileHash && (
                        <div className="mt-2">
                          <span className="text-carbon-500 text-xs">SHA-256 Hash:</span>
                          <code className="block text-violet-400 text-xs font-mono mt-0.5">
                            {truncateHash(fileHash, 16)}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1 hover:bg-carbon-700 rounded transition"
                  >
                    <X className="w-5 h-5 text-carbon-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  isDragging 
                    ? 'border-crimson-500 bg-crimson-900/10' 
                    : 'border-carbon-700 hover:border-carbon-600'
                }`}
              >
                <Upload className="w-10 h-10 text-carbon-500 mx-auto mb-4" />
                <p className="text-carbon-300 mb-2">Drag and drop your file here, or</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-carbon-800 hover:bg-carbon-700 text-carbon-200 rounded-lg font-medium cursor-pointer transition">
                  <input
                    type="file"
                    onChange={handleInputChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                  />
                  Browse Files
                </label>
                <p className="text-carbon-500 text-sm mt-4">
                  Supports PDF, DOC, XLS, TXT, and image files
                </p>
              </div>
            )}
          </div>

          {/* Topic Selection */}
          <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-carbon-300 mb-2">
              Topic *
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-4 py-3 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-100 focus:outline-none focus:ring-2 focus:ring-crimson-500"
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name} ({topic.topicId})
                </option>
              ))}
            </select>
          </div>

          {/* Category Selection */}
          <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-carbon-300 mb-2">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-100 focus:outline-none focus:ring-2 focus:ring-crimson-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-6">
            <label className="block text-sm font-medium text-carbon-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this document..."
              rows={3}
              className="w-full px-4 py-3 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-100 placeholder-carbon-500 focus:outline-none focus:ring-2 focus:ring-crimson-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link
              href="/dashboard/documents"
              className="flex-1 px-4 py-3 bg-carbon-800 hover:bg-carbon-700 text-carbon-200 rounded-lg font-medium transition text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="flex-1 px-4 py-3 bg-crimson-600 hover:bg-crimson-700 disabled:bg-crimson-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting to Hedera...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload & Hash
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
