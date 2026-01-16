'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Upload, 
  ExternalLink, 
  MoreVertical,
  Trash2,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { truncateHash, formatBytes } from '@/lib/utils';

interface Document {
  id: string;
  originalName: string;
  hash: string;
  category: string;
  status: string;
  size: number;
  mimeType: string;
  sequenceNumber?: number;
  transactionId?: string;
  createdAt: string;
  topic: {
    id: string;
    name: string;
    topicId: string;
  };
}

interface Topic {
  id: string;
  name: string;
  topicId: string;
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
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

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', label: 'Pending' },
  SUBMITTED: { bg: 'bg-blue-900/20', text: 'text-blue-400', label: 'Submitted' },
  CONFIRMED: { bg: 'bg-green-900/20', text: 'text-green-400', label: 'Confirmed' },
  FAILED: { bg: 'bg-red-900/20', text: 'text-red-400', label: 'Failed' },
};

export default function DocumentsClient() {
  const searchParams = useSearchParams();
  const topicIdFilter = searchParams.get('topicId');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(topicIdFilter || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedTopic, selectedCategory]);

  const fetchData = async () => {
    try {
      const [docsData, topicsData] = await Promise.all([
        api.getDocuments({ topicId: selectedTopic, category: selectedCategory }),
        api.getTopics(),
      ]);
      setDocuments(docsData);
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) return;
    
    try {
      await api.deleteDocument(documentId);
      setDocuments(documents.filter(d => d.id !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
    setShowMenu(null);
  };

  const handleVerify = async (documentId: string) => {
    try {
      const result = await api.verifyDocument(documentId);
      alert(`Verification: ${result.status}\n${result.details || ''}`);
    } catch (error) {
      console.error('Failed to verify document:', error);
    }
    setShowMenu(null);
  };

  const getHashScanUrl = (topicId: string, sequenceNumber?: number) => {
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    if (sequenceNumber) {
      return `https://hashscan.io/${network}/topic/${topicId}/message/${sequenceNumber}`;
    }
    return `https://hashscan.io/${network}/topic/${topicId}`;
  };

  const getStatusInfo = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crimson-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-carbon-100">Documents</h1>
          <p className="text-carbon-400">View and manage your hashed compliance documents</p>
        </div>
        <Link
          href="/dashboard/documents/upload"
          className="px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-medium transition inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-carbon-500" />
          <span className="text-carbon-400 text-sm">Filter by:</span>
        </div>
        
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="px-3 py-2 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-200 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500"
        >
          <option value="">All Topics</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>{topic.name}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-200 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        {(selectedTopic || selectedCategory) && (
          <button
            onClick={() => {
              setSelectedTopic('');
              setSelectedCategory('');
            }}
            className="text-sm text-carbon-400 hover:text-carbon-200 transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-carbon-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-carbon-200 mb-2">No documents found</h3>
          <p className="text-carbon-400 mb-6">
            {selectedTopic || selectedCategory 
              ? 'Try adjusting your filters'
              : 'Upload your first document to get started'}
          </p>
          <Link
            href="/dashboard/documents/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-medium transition"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Link>
        </div>
      ) : (
        <div className="bg-carbon-900 border border-carbon-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-carbon-800/50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-carbon-400 uppercase tracking-wider">Document</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-carbon-400 uppercase tracking-wider">Topic</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-carbon-400 uppercase tracking-wider">Hash</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-carbon-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-carbon-400 uppercase tracking-wider">Date</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-carbon-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-carbon-800">
              {documents.map((doc) => {
                const statusInfo = getStatusInfo(doc.status);
                return (
                  <tr key={doc.id} className="hover:bg-carbon-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-carbon-800 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-carbon-400" />
                        </div>
                        <div>
                          <div className="text-carbon-100 font-medium truncate max-w-[200px]">
                            {doc.originalName}
                          </div>
                          <div className="text-carbon-500 text-sm">
                            {formatBytes(doc.size)} • {doc.category.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/topics?highlight=${doc.topic.id}`}
                        className="text-violet-400 hover:text-violet-300 text-sm"
                      >
                        {doc.topic.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-carbon-300 text-sm font-mono">
                        {truncateHash(doc.hash)}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                        {doc.status === 'CONFIRMED' && <CheckCircle2 className="w-3 h-3" />}
                        {doc.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {doc.status === 'FAILED' && <AlertCircle className="w-3 h-3" />}
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-carbon-400 text-sm">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setShowMenu(showMenu === doc.id ? null : doc.id)}
                          className="p-2 hover:bg-carbon-800 rounded-lg transition"
                        >
                          <MoreVertical className="w-4 h-4 text-carbon-400" />
                        </button>
                        
                        {showMenu === doc.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-carbon-800 border border-carbon-700 rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => handleVerify(doc.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-carbon-200 hover:bg-carbon-700 transition text-left"
                            >
                              <Shield className="w-4 h-4" />
                              Verify
                            </button>
                            {doc.sequenceNumber && (
                              <a
                                href={getHashScanUrl(doc.topic.topicId, doc.sequenceNumber)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2 px-4 py-2 text-carbon-200 hover:bg-carbon-700 transition"
                              >
                                <ExternalLink className="w-4 h-4" />
                                View on HashScan
                              </a>
                            )}
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-crimson-400 hover:bg-carbon-700 transition text-left"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
