'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization, useUser } from '@clerk/nextjs';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTenant = async () => {
    if (!user) {
      setError('No user found. Please sign in.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use organization if available, otherwise use user account
      const tenantData = organization ? {
        name: organization.name,
        slug: organization.slug || organization.id,
        clerkOrgId: organization.id,
      } : {
        name: user.fullName || user.username || 'My Workspace',
        slug: user.id,
        clerkOrgId: user.id,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData),
      });

      if (!response.ok) {
        throw new Error('Failed to create tenant');
      }

      const tenant = await response.json();
      console.log('Tenant created:', tenant);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold">Welcome to glyphHash</h1>
        
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <h2 className="mb-2 text-xl font-semibold">Setting up your compliance workspace</h2>
          <p className="text-gray-700">
            We're creating your private Hedera HCS topic for immutable compliance logging.
            This will enable you to create tamper-proof audit trails for SOC 2, ISO 27001, NIST, and HIPAA compliance.
          </p>
        </div>

        {organization ? (
          <div className="mb-6">
            <p className="text-sm text-gray-600">Organization:</p>
            <p className="text-lg font-semibold">{organization.name}</p>
          </div>
        ) : user && (
          <div className="mb-6">
            <p className="text-sm text-gray-600">Personal Workspace:</p>
            <p className="text-lg font-semibold">{user.fullName || user.username || 'My Workspace'}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleCreateTenant}
          disabled={loading || !user}
          className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Complete Setup'}
        </button>

        {!user && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Please sign in to continue
          </p>
        )}
      </div>
    </div>
  );
}
