'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Hash, 
  Plus, 
  ExternalLink, 
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  Copy,
  X,
} from 'lucide-react';
import api from '@/lib/api';

interface Topic {
  id: string;
  topicId: string;
  name: string;
  description?: string;
  bindingHash: string;
  createdAt: string;
  _count?: {
    documents: number;
  };
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const data = await api.getTopics();
      setTopics(data);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (topic: Topic) => {
    setEditingTopic(topic);
    setEditName(topic.name);
    setEditDescription(topic.description || '');
    setShowMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTopic) return;
    
    try {
      await api.updateTopic(editingTopic.id, {
        name: editName,
        description: editDescription,
      });
      setTopics(topics.map(t => 
        t.id === editingTopic.id 
          ? { ...t, name: editName, description: editDescription }
          : t
      ));
      setEditingTopic(null);
    } catch (error) {
      console.error('Failed to update topic:', error);
    }
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic? This cannot be undone.')) return;
    
    try {
      await api.deleteTopic(topicId);
      setTopics(topics.filter(t => t.id !== topicId));
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
    setShowMenu(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-carbon-100">Topics</h1>
          <p className="text-carbon-400">Manage your Hedera Consensus Service topics</p>
        </div>
        <Link
          href="/dashboard/topics/new"
          className="px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-medium transition inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Topic
        </Link>
      </div>

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-12 text-center">
          <Hash className="w-12 h-12 text-carbon-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-carbon-200 mb-2">No topics yet</h3>
          <p className="text-carbon-400 mb-6">Create your first Hedera topic to start hashing documents</p>
          <Link
            href="/dashboard/topics/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Create Your First Topic
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-carbon-900 border border-carbon-800 rounded-xl p-6 hover:border-carbon-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-carbon-800 rounded-xl flex items-center justify-center">
                    <Hash className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-carbon-100 text-lg">{topic.name}</h3>
                    {topic.description && (
                      <p className="text-carbon-400 text-sm mt-1">{topic.description}</p>
                    )}
                    
                    {/* Topic ID with HashScan link */}
                    <div className="flex items-center gap-2 mt-3">
                      <code className="text-sm text-carbon-300 bg-carbon-800 px-2 py-1 rounded">
                        {topic.topicId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(topic.topicId)}
                        className="p-1 hover:bg-carbon-800 rounded transition"
                        title="Copy Topic ID"
                      >
                        <Copy className="w-4 h-4 text-carbon-500" />
                      </button>
                      <a
                        href={getHashScanUrl(topic.topicId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition"
                      >
                        View on HashScan
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(showMenu === topic.id ? null : topic.id)}
                    className="p-2 hover:bg-carbon-800 rounded-lg transition"
                  >
                    <MoreVertical className="w-5 h-5 text-carbon-400" />
                  </button>
                  
                  {showMenu === topic.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-carbon-800 border border-carbon-700 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => handleEditClick(topic)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-carbon-200 hover:bg-carbon-700 transition text-left"
                      >
                        <Edit2 className="w-4 h-4" />
                        Rename
                      </button>
                      <Link
                        href={`/dashboard/documents?topicId=${topic.id}`}
                        className="w-full flex items-center gap-2 px-4 py-2 text-carbon-200 hover:bg-carbon-700 transition"
                      >
                        <FileText className="w-4 h-4" />
                        View Documents
                      </Link>
                      <button
                        onClick={() => handleDelete(topic.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-crimson-400 hover:bg-carbon-700 transition text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-carbon-800">
                <div className="flex items-center gap-2 text-carbon-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">{topic._count?.documents || 0} documents</span>
                </div>
                <div className="flex items-center gap-2 text-carbon-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Created {new Date(topic.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-carbon-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingTopic && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-carbon-100">Edit Topic</h2>
              <button
                onClick={() => setEditingTopic(null)}
                className="p-1 hover:bg-carbon-800 rounded transition"
              >
                <X className="w-5 h-5 text-carbon-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-carbon-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-100 focus:outline-none focus:ring-2 focus:ring-crimson-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-carbon-300 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-100 focus:outline-none focus:ring-2 focus:ring-crimson-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingTopic(null)}
                className="flex-1 px-4 py-2 bg-carbon-800 hover:bg-carbon-700 text-carbon-200 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-medium transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
