'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Hash, 
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';

const COMPANY_IDENTIFIER = 'GLYPHHASH';

export default function NewTopicPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ topicId: string; transactionId: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Topic name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.createTopic({
        name: name.trim(),
        description: description.trim() || undefined,
        companyIdentifier: COMPANY_IDENTIFIER,
      });

      setSuccess({
        topicId: result.topic.topicId,
        transactionId: result.transactionId,
      });

      // Redirect after a delay
      setTimeout(() => {
        router.push('/dashboard/topics');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topic');
    } finally {
      setLoading(false);
    }
  };

  const getHashScanUrl = (topicId: string) => {
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    return `https://hashscan.io/${network}/topic/${topicId}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/topics"
          className="inline-flex items-center gap-2 text-carbon-400 hover:text-carbon-200 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Topics
        </Link>
        <h1 className="font-display text-2xl font-bold text-carbon-100">Create New Topic</h1>
        <p className="text-carbon-400 mt-1">
          Create a new Hedera Consensus Service topic for your compliance documents
        </p>
      </div>

      {success ? (
        <div className="bg-carbon-900 border border-green-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-carbon-100 mb-2">Topic Created Successfully!</h2>
          <p className="text-carbon-400 mb-4">Your new HCS topic is now active on Hedera</p>
          
          <div className="bg-carbon-800 rounded-lg p-4 text-left space-y-2">
            <div>
              <span className="text-carbon-500 text-sm">Topic ID:</span>
              <a
                href={getHashScanUrl(success.topicId)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-violet-400 hover:text-violet-300 font-mono"
              >
                {success.topicId}
              </a>
            </div>
            <div>
              <span className="text-carbon-500 text-sm">Transaction ID:</span>
              <p className="text-carbon-200 font-mono text-sm truncate">{success.transactionId}</p>
            </div>
          </div>
          
          <p className="text-carbon-500 text-sm mt-4">Redirecting to topics list...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-carbon-900 border border-carbon-800 rounded-xl p-6">
          {error && (
            <div className="mb-6 p-4 bg-crimson-900/20 border border-crimson-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-crimson-400 flex-shrink-0" />
              <span className="text-crimson-300">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Topic Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-carbon-300 mb-2">
                Topic Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production Compliance 2024"
                className="w-full px-4 py-3 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-100 placeholder-carbon-500 focus:outline-none focus:ring-2 focus:ring-crimson-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-carbon-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this topic..."
                rows={4}
                className="w-full px-4 py-3 bg-carbon-800 border border-carbon-700 rounded-lg text-carbon-100 placeholder-carbon-500 focus:outline-none focus:ring-2 focus:ring-crimson-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="bg-carbon-800/50 border border-carbon-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Hash className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-carbon-300 font-medium mb-1">What happens when you create a topic?</p>
                  <ul className="text-carbon-400 space-y-1">
                    <li>• A new HCS topic is created on Hedera {process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet'}</li>
                    <li>• A binding hash is submitted as the first message</li>
                    <li>• The topic ID is linked to your organization: <span className="text-violet-400">{COMPANY_IDENTIFIER}</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <Link
              href="/dashboard/topics"
              className="flex-1 px-4 py-3 bg-carbon-800 hover:bg-carbon-700 text-carbon-200 rounded-lg font-medium transition text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-crimson-600 hover:bg-crimson-700 disabled:bg-crimson-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating on Hedera...
                </>
              ) : (
                <>
                  <Hash className="w-5 h-5" />
                  Create Topic
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
