import Link from "next/link";
import {
  ArrowRight,
  Code2,
  Wallet,
  ShieldCheck,
  Activity,
  KeyRound,
  BarChart3,
} from "lucide-react";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
  <Image
    src="/assets/logo.png"
    alt="Ayax Logo"
    width={50}
    height={50}
    priority
  />

  <div>
    <h2 className="text-xl font-bold">
      Ayax <span className="text-blue-500">APIs</span>
    </h2>
    <p className="text-xs text-slate-400">
      Developer Marketplace
    </p>
  </div>
</Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/login">Login</Link>
          <Link
            href="/register"
            className="bg-blue-600 px-5 py-2 rounded-xl text-white font-semibold"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full mb-6 text-sm">
            <Activity size={16} />
            Telecom & VTU API Marketplace
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
            Sell, Build & Scale with Ayax Developer APIs
          </h1>

          <p className="text-slate-300 mt-6 text-lg leading-8">
            Professional API marketplace for developers and businesses to buy
            Data, Airtime, Wallet, and Transaction Verification APIs with secure
            API keys and real-time transaction monitoring.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 px-7 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
            >
              Create Developer Account <ArrowRight size={18} />
            </Link>

            <Link
              href="/docs"
              className="border border-slate-700 px-7 py-4 rounded-2xl font-semibold text-slate-200 text-center"
            >
              View API Docs
            </Link>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="bg-slate-950 rounded-2xl p-5 font-mono text-sm">
            <p className="text-green-400">POST /api/v1/data/buy</p>
            <pre className="text-slate-300 mt-4 whitespace-pre-wrap">
{`{
  "network": "MTN",
  "phone": "08012345678",
  "plan": "1GB",
  "reference": "AYAX-2026-0001"
}`}
            </pre>
            <div className="mt-5 border-t border-slate-800 pt-5">
              <p className="text-blue-400">Response</p>
              <pre className="text-slate-300 mt-3 whitespace-pre-wrap">
{`{
  "success": true,
  "message": "Transaction processing",
  "status": "processing"
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        <Feature
          icon={<Code2 />}
          title="Developer APIs"
          text="Data purchase, airtime purchase, wallet and transaction status APIs."
        />
        <Feature
          icon={<KeyRound />}
          title="Secure API Keys"
          text="Generate, revoke, regenerate and track API keys per developer."
        />
        <Feature
          icon={<Wallet />}
          title="Wallet System"
          text="Fund wallet, auto deduction, transaction history and admin credit/debit."
        />
        <Feature
          icon={<ShieldCheck />}
          title="Enterprise Security"
          text="JWT auth, API key auth, rate limiting, validation and request logging."
        />
        <Feature
          icon={<BarChart3 />}
          title="Usage Analytics"
          text="Monitor API calls, revenue, failed transactions and live usage stats."
        />
        <Feature
          icon={<Activity />}
          title="Live Transactions"
          text="Socket.IO-powered real-time transaction status updates."
        />
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-slate-500">
        © 2026 Ayax Digital Solutions. All rights reserved.
      </footer>
    </main>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500 transition">
      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-7">{text}</p>
    </div>
  );
}