'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [accountId, setAccountId] = useState('0.0.5392671');
  const [privateKey, setPrivateKey] = useState('302e020100300506032b6570042204209a7eaa05b88a141e4e6577118aae72efad7ea331f4df43e824d326438c373dec');
  const router = useRouter();

  const handleLogin = () => {
    // Simple demo login - just store in localStorage
    localStorage.setItem('demoLoggedIn', 'true');
    localStorage.setItem('demoAccountId', accountId);
    localStorage.setItem('demoPrivateKey', privateKey);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to GlyphHash Demo
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use the testnet credentials below to access the demo
          </p>
        </div>
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">
                Hedera Account ID
              </label>
              <input
                id="accountId"
                name="accountId"
                type="text"
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700">
                Hedera Private Key
              </label>
              <input
                id="privateKey"
                name="privateKey"
                type="password"
                required
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <button
                onClick={handleLogin}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In to Demo
              </button>
            </div>
          </div>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Demo Notice</span>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-gray-600">
              This is a demo environment using Hedera testnet. Credentials are shared for testing purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}