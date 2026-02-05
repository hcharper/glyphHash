import Link from 'next/link';
import Image from 'next/image';
import { Shield, FileCheck, Users, ArrowRight, Globe, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-carbon-950">
      {/* Header */}
      <header className="border-b border-carbon-800 bg-carbon-900/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="GlyphHash" 
              width={40} 
              height={40}
              className="rounded-lg"
            />
            <span className="font-display text-xl font-bold text-carbon-100">GlyphHash</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-medium transition"
            >
              Start Demo
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-900/30 text-violet-300 text-sm font-medium mb-6 border border-violet-800/50">
            <Globe className="w-4 h-4" />
            Powered by Hedera Blockchain
          </div>
          
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-carbon-100 leading-tight mb-6">
            Immutable Audit Trails for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson-400 to-violet-400">
              Compliance Excellence
            </span>
          </h1>
          
          <p className="text-xl text-carbon-400 mb-10 max-w-2xl mx-auto">
            Reduce SOC 2 audit costs by 65% with blockchain-verified evidence. 
            Mathematical proof of when compliance evidence was created.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-semibold text-xl transition"
            >
              Start Demo
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Immutable Hashing"
            description="SHA-256 hashes of your compliance documents anchored to Hedera's public ledger. Tamper-proof by design."
          />
          <FeatureCard
            icon={<FileCheck className="w-8 h-8" />}
            title="Instant Verification"
            description="Auditors verify evidence authenticity in seconds, not hours. Cross-reference any document against the blockchain."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Multi-Tenant"
            description="Each organization gets a dedicated Hedera topic. Complete isolation with cryptographic ownership proof."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-carbon-900/50 py-20 border-y border-carbon-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-carbon-100 text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <WorkflowStep
              number={1}
              title="Create Topic"
              description="Setup your organization's dedicated Hedera topic with cryptographic binding to your company ID."
            />
            <WorkflowStep
              number={2}
              title="Upload Documents"
              description="Drag & drop compliance evidence. We compute SHA-256 hash and submit to your topic on Hedera."
            />
            <WorkflowStep
              number={3}
              title="Verify Anytime"
              description="Auditors can verify any document against the blockchain. Instant proof of authenticity and timestamp."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-carbon-900 to-carbon-800 rounded-2xl p-12 border border-carbon-700">
            <Lock className="w-12 h-12 mx-auto mb-6 text-violet-400" />
            <h2 className="font-display text-3xl font-bold mb-4 text-carbon-100">
              Ready to Secure Your Compliance Evidence?
            </h2>
            <p className="text-carbon-400 mb-8 max-w-xl mx-auto">
              Start hashing your documents today. All transactions visible on Hedera&apos;s public ledger
              for complete transparency and auditability.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg font-semibold text-lg transition"
            >
              Open Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-carbon-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-carbon-500 text-sm">
          <p>© 2026 GlyphHash. Blockchain-verified compliance evidence.</p>
          <p className="mt-2">
            Built on{' '}
            <a 
              href="https://hedera.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300"
            >
              Hedera
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-6 hover:border-carbon-700 transition">
      <div className="w-14 h-14 bg-violet-600/20 text-violet-400 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-carbon-100 mb-2">{title}</h3>
      <p className="text-carbon-400">{description}</p>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-crimson-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-display text-xl font-bold">
        {number}
      </div>
      <h3 className="font-display text-xl font-semibold text-carbon-100 mb-2">{title}</h3>
      <p className="text-carbon-400">{description}</p>
    </div>
  );
}
