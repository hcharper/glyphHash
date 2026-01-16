'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Hash, 
  FileText, 
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Upload,
  ExternalLink,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { truncateHash } from '@/lib/utils';

interface Stats {
  totalTopics: number;
  totalDocuments: number;
  confirmedDocuments: number;
  pendingDocuments: number;
}

interface Topic {
  id: string;
  name: string;
  topicId: string;
  createdAt: string;
  _count?: { documents: number };
}

interface Document {
  id: string;
  originalName: string;
  hash: string;
  status: string;
  category: string;
  createdAt: string;
  topic: {
    name: string;
    topicId: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ 
    totalTopics: 0, 
    totalDocuments: 0, 
    confirmedDocuments: 0, 
    pendingDocuments: 0 
  });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [topicsData, docsData] = await Promise.all([
        api.getTopics(),
        api.getDocuments({}),
      ]);
      
      setTopics(topicsData.slice(0, 5));
      setRecentDocuments(docsData.slice(0, 5));
      
      const confirmed = docsData.filter((d: any) => d.status === 'CONFIRMED').length;
      const pending = docsData.filter((d: any) => d.status === 'PENDING' || d.status === 'SUBMITTED').length;
      
      setStats({
        totalTopics: topicsData.length,
        totalDocuments: docsData.length,
        confirmedDocuments: confirmed,
        pendingDocuments: pending,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHashScanUrl = (topicId: string) => {
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    return `https://hashscan.io/${network}/topic/${topicId}`;
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-carbon-100">Dashboard</h1>
          <p className="text-carbon-400">Welcome back! Here's your compliance overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/documents/upload"
            className="px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-medium transition inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Hash className="w-6 h-6" />}
          label="Total Topics"
          value={stats.totalTopics}
          color="violet"
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          label="Total Documents"
          value={stats.totalDocuments}
          color="blue"
        />
        <StatCard
          icon={<CheckCircle2 className="w-6 h-6" />}
          label="Confirmed"
          value={stats.confirmedDocuments}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="Pending"
          value={stats.pendingDocuments}
          color="yellow"
        />
      </div>

      {/* Quick Actions */}
      {stats.totalTopics === 0 && (
        <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-600/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-carbon-100">Get Started</h3>
              <p className="text-carbon-400 text-sm">Create your first topic to begin hashing compliance documents</p>
            </div>
            <Link
              href="/dashboard/topics/new"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Topic
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <div className="lg:col-span-2 bg-carbon-900 rounded-xl border border-carbon-800 overflow-hidden">
          <div className="p-4 border-b border-carbon-800 flex items-center justify-between">
            <h2 className="font-semibold text-carbon-100">Recent Documents</h2>
            <Link href="/dashboard/documents" className="text-sm text-crimson-400 hover:text-crimson-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-10 h-10 text-carbon-600 mx-auto mb-3" />
              <p className="text-carbon-400">No documents yet</p>
              <Link
                href="/dashboard/documents/upload"
                className="inline-flex items-center gap-2 mt-4 text-sm text-crimson-400 hover:text-crimson-300"
              >
                <Upload className="w-4 h-4" />
                Upload your first document
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-carbon-800">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-carbon-800/50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-carbon-800 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-carbon-400" />
                      </div>
                      <div>
                        <p className="font-medium text-carbon-100 truncate max-w-[250px]">{doc.originalName}</p>
                        <p className="text-sm text-carbon-500">{doc.category.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-carbon-500 font-mono mt-1">
                          {truncateHash(doc.hash, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={doc.status} />
                      <p className="text-xs text-carbon-500 mt-1">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Topics */}
        <div className="bg-carbon-900 rounded-xl border border-carbon-800 overflow-hidden">
          <div className="p-4 border-b border-carbon-800 flex items-center justify-between">
            <h2 className="font-semibold text-carbon-100">Your Topics</h2>
            <Link href="/dashboard/topics" className="text-sm text-crimson-400 hover:text-crimson-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {topics.length === 0 ? (
            <div className="p-8 text-center">
              <Hash className="w-10 h-10 text-carbon-600 mx-auto mb-3" />
              <p className="text-carbon-400">No topics yet</p>
              <Link
                href="/dashboard/topics/new"
                className="inline-flex items-center gap-2 mt-4 text-sm text-crimson-400 hover:text-crimson-300"
              >
                <Plus className="w-4 h-4" />
                Create a topic
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-carbon-800">
              {topics.map((topic) => (
                <div key={topic.id} className="p-4 hover:bg-carbon-800/50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-carbon-100">{topic.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-carbon-400 font-mono">{topic.topicId}</code>
                        <a
                          href={getHashScanUrl(topic.topicId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-carbon-300">{topic._count?.documents || 0}</p>
                      <p className="text-xs text-carbon-500">documents</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="p-4 border-t border-carbon-800">
            <Link
              href="/dashboard/topics/new"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-carbon-800 hover:bg-carbon-700 text-carbon-200 rounded-lg font-medium transition"
            >
              <Plus className="w-4 h-4" />
              New Topic
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  color: 'violet' | 'blue' | 'green' | 'yellow';
}) {
  const colorClasses = {
    violet: 'bg-violet-600/20 text-violet-400',
    blue: 'bg-blue-600/20 text-blue-400',
    green: 'bg-green-600/20 text-green-400',
    yellow: 'bg-yellow-600/20 text-yellow-400',
  };

  return (
    <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-carbon-400 text-sm">{label}</p>
          <p className="font-display text-2xl font-bold text-carbon-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    CONFIRMED: { 
      bg: 'bg-green-900/30', 
      text: 'text-green-400',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    SUBMITTED: { 
      bg: 'bg-blue-900/30', 
      text: 'text-blue-400',
      icon: <Clock className="w-3 h-3" />
    },
    PENDING: { 
      bg: 'bg-yellow-900/30', 
      text: 'text-yellow-400',
      icon: <Clock className="w-3 h-3" />
    },
    FAILED: { 
      bg: 'bg-red-900/30', 
      text: 'text-red-400',
      icon: <AlertCircle className="w-3 h-3" />
    },
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status}
    </span>
  );
}
