'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Home, 
  FileText, 
  Shield, 
  Settings,
  Plus,
  Search,
  Hash,
  Upload,
  X,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const disclaimerDismissed = localStorage.getItem('disclaimerDismissed');
    if (!disclaimerDismissed) {
      setShowDisclaimer(true);
    }
  }, []);

  const dismissDisclaimer = () => {
    localStorage.setItem('disclaimerDismissed', 'true');
    setShowDisclaimer(false);
  };

  return (
    <div className="min-h-screen bg-carbon-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-carbon-900 text-white flex flex-col border-r border-carbon-800">
        {/* Logo */}
        <div className="p-4 border-b border-carbon-800">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="GlyphHash" 
              width={40} 
              height={40}
              className="rounded-lg"
            />
            <span className="font-display text-xl font-bold">GlyphHash</span>
          </Link>
        </div>

        {/* Company Info */}
        <div className="px-4 py-3 border-b border-carbon-800">
          <div className="text-xs text-carbon-500 uppercase tracking-wider mb-1">Organization</div>
          <div className="text-sm font-medium text-carbon-100">GlyphHash Inc.</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem 
            href="/dashboard" 
            icon={<Home className="w-5 h-5" />} 
            label="Overview" 
            active={pathname === '/dashboard'} 
          />
          <NavItem 
            href="/dashboard/topics" 
            icon={<Hash className="w-5 h-5" />} 
            label="Topics" 
            active={pathname?.startsWith('/dashboard/topics')} 
          />
          <NavItem 
            href="/dashboard/documents" 
            icon={<FileText className="w-5 h-5" />} 
            label="Documents" 
            active={pathname?.startsWith('/dashboard/documents')} 
          />
          <NavItem 
            href="/dashboard/verification" 
            icon={<Shield className="w-5 h-5" />} 
            label="Verification" 
            active={pathname?.startsWith('/dashboard/verification')} 
          />
          
          <div className="pt-4 mt-4 border-t border-carbon-800">
            <NavItem 
              href="/dashboard/settings" 
              icon={<Settings className="w-5 h-5" />} 
              label="Settings" 
              active={pathname?.startsWith('/dashboard/settings')} 
            />
          </div>
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-carbon-800 space-y-2">
          <Link
            href="/dashboard/documents/upload"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-crimson-600 hover:bg-crimson-700 rounded-lg font-medium transition"
          >
            <Upload className="w-5 h-5" />
            Upload Document
          </Link>
          <Link
            href="/dashboard/topics/new"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-carbon-800 hover:bg-carbon-700 border border-carbon-700 rounded-lg font-medium transition"
          >
            <Plus className="w-5 h-5" />
            New Topic
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-carbon-900 border-b border-carbon-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-carbon-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Search documents..."
                className="pl-10 pr-4 py-2 bg-carbon-800 border border-carbon-700 text-carbon-100 placeholder-carbon-500 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-crimson-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="GlyphHash" 
                width={32} 
                height={32}
                className="rounded-full"
              />
              <span className="text-sm font-medium text-carbon-200">GlyphHash Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto bg-carbon-950">
          {children}
        </main>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-carbon-900 p-6 rounded-lg max-w-md w-full mx-4 border border-carbon-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-carbon-100">Demo Disclaimer</h3>
              <button
                onClick={dismissDisclaimer}
                className="text-carbon-400 hover:text-carbon-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-carbon-300 mb-6">
              <p className="mb-3">
                This is a <strong>demo environment</strong> using Hedera testnet. All users share the same Hedera account for testing purposes.
              </p>
              <p className="mb-3">
                <strong>Important:</strong> Do not use real funds or sensitive data. Operations are visible to all demo users.
              </p>
              <p>
                By proceeding, you acknowledge this is for demonstration only and understand the shared nature of the testnet account.
              </p>
            </div>
            <button
              onClick={dismissDisclaimer}
              className="w-full px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg transition font-medium"
            >
              I Understand, Continue to Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  active = false 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
        active 
          ? 'bg-carbon-800 text-white border-l-2 border-crimson-500' 
          : 'text-carbon-400 hover:text-white hover:bg-carbon-800'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}
