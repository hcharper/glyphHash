'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { hashFile } from '@/lib/crypto';
import { api } from '@/lib/api';

interface UploadEvidenceProps {
  onSuccess?: () => void;
}

export default function UploadEvidence({ onSuccess }: UploadEvidenceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'hashing' | 'uploading' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logId, setLogId] = useState<string | null>(null);
  const [hcsMessageId, setHcsMessageId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('SECURITY_MONITORING');
  const [severity, setSeverity] = useState('MEDIUM');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setStatus('idle');
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'text/*': ['.txt', '.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const handleUpload = async () => {
    if (!file || !title) {
      setError('Please provide a title and select a file');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setProgress(10);

      // Step 1: Calculate SHA-256 hash
      setStatus('hashing');
      setProgress(20);
      const fileHash = await hashFile(file);
      console.log('File hash:', fileHash);
      setProgress(30);

      // Step 2: Create compliance log
      setStatus('uploading');
      const logResponse = await api.createLog({
        title,
        description,
        category,
        severity,
        evidenceHash: fileHash,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      });
      
      const newLogId = logResponse.data.id;
      setLogId(newLogId);
      setProgress(50);

      // Step 3: Get presigned upload URL
      const urlResponse = await api.getEvidenceUploadUrl(
        newLogId,
        file.name,
        file.type,
      );
      
      const { uploadUrl, fileKey } = urlResponse.data;
      setProgress(60);

      // Step 4: Upload file to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      setProgress(70);

      // Step 5: Update log with evidence URL
      await api.updateEvidence(newLogId, {
        evidenceUrl: fileKey,
        evidenceHash: fileHash,
      });
      setProgress(80);

      // Step 6: Submit to Hedera HCS
      setStatus('submitting');
      const hcsResponse = await api.submitToHCS(newLogId);
      setHcsMessageId(hcsResponse.data.hcsMessageId);
      setProgress(100);

      // Success!
      setStatus('success');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || err.message || 'Upload failed');
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('SECURITY_MONITORING');
    setSeverity('MEDIUM');
    setStatus('idle');
    setProgress(0);
    setError(null);
    setLogId(null);
    setHcsMessageId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Compliance Evidence</CardTitle>
        <CardDescription>
          Upload documents and submit them to the Hedera blockchain for immutable timestamping
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Evidence submitted successfully!</h3>
                <p className="text-sm text-green-700">
                  Your compliance log has been created and verified on the Hedera blockchain.
                </p>
              </div>
            </div>

            {hcsMessageId && (
              <div className="space-y-2 rounded-lg border bg-gray-50 p-4">
                <p className="text-sm font-medium">Blockchain Details:</p>
                <div className="space-y-1 text-sm">
                  <p className="font-mono text-xs break-all">
                    <span className="text-gray-600">Message ID:</span> {hcsMessageId}
                  </p>
                  <a
                    href={`https://hashscan.io/testnet/topic/${hcsMessageId.split('@')[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    View on HashScan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            <Button onClick={reset} className="w-full">
              Upload Another File
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Q4 2024 Security Audit Report"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Annual security assessment conducted by CyberSec Inc."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={uploading}
                  >
                    <option value="SECURITY_MONITORING">Security Monitoring</option>
                    <option value="ACCESS_CONTROL">Access Control</option>
                    <option value="INCIDENT_RESPONSE">Incident Response</option>
                    <option value="CHANGE_MANAGEMENT">Change Management</option>
                    <option value="RISK_ASSESSMENT">Risk Assessment</option>
                    <option value="VENDOR_MANAGEMENT">Vendor Management</option>
                    <option value="DATA_PRIVACY">Data Privacy</option>
                    <option value="BUSINESS_CONTINUITY">Business Continuity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={uploading}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* File Dropzone */}
            <div>
              <label className="block text-sm font-medium mb-2">
                File <span className="text-red-500">*</span>
              </label>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} disabled={uploading} />
                
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-blue-600" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {!uploading && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <p className="text-sm">
                      {isDragActive
                        ? 'Drop the file here'
                        : 'Drag & drop a file here, or click to select'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Supports PDF, images, text, JSON, Excel (max 100MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {status === 'hashing' && 'Calculating file hash...'}
                    {status === 'uploading' && 'Uploading to storage...'}
                    {status === 'submitting' && 'Submitting to blockchain...'}
                  </span>
                  <span className="text-gray-600">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleUpload}
              disabled={!file || !title || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Submit to Blockchain
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
