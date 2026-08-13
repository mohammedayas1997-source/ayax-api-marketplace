import Link from "next/link";
import {
  ShieldCheck,
  Database,
  LockKeyhole,
  FileText,
  UserCheck,
  Globe2,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full mb-6 text-sm">
          <ShieldCheck size={16} />
          Privacy Policy
        </div>

        <h1 className="text-5xl font-extrabold mb-6">
          Your privacy matters to Ayax APIs.
        </h1>

        <p className="text-slate-300 leading-8 text-lg">
          This Privacy Policy explains how Ayax Digital Solutions collects,
          uses, stores and protects information when you use Ayax API
          Marketplace, developer accounts, wallet services, API keys and related
          digital services.
        </p>

        <p className="text-slate-500 mt-4">
          Last updated: June 2026
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 space-y-6">
        <PolicyCard
          icon={<Database />}
          title="Information We Collect"
          text="We may collect account information such as name, email address, phone number, business details, wallet records, API usage logs, transaction references, IP address, device information and support messages."
        />

        <PolicyCard
          icon={<FileText />}
          title="How We Use Your Information"
          text="We use your information to create and manage accounts, process wallet funding, secure API keys, monitor API usage, prevent fraud, improve our services, provide support and comply with legal or regulatory requirements."
        />

        <PolicyCard
          icon={<LockKeyhole />}
          title="API Logs and Security"
          text="Ayax APIs may store request logs, response status, timestamps, IP addresses and usage metrics to help developers monitor integrations, detect failed requests and protect the platform from abuse."
        />

        <PolicyCard
          icon={<ShieldCheck />}
          title="Payment and Wallet Data"
          text="Wallet balances, funding requests, withdrawal records and transaction histories are stored securely for accounting, audit, dispute resolution and service delivery purposes."
        />

        <PolicyCard
          icon={<UserCheck />}
          title="Data Sharing"
          text="We do not sell personal information. We may share limited data with trusted service providers, payment processors, infrastructure providers or authorities where required by law."
        />

        <PolicyCard
          icon={<Globe2 />}
          title="Your Rights"
          text="You may request access, correction or deletion of your personal data, subject to legal, security, fraud prevention and financial record obligations."
        />

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
          <p className="text-slate-300 leading-8">
            For privacy questions or data requests, contact Ayax Digital
            Solutions through our official support channels.
          </p>

          <Link
            href="/contact"
            className="inline-flex mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-semibold"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </main>
  );
}

function PolicyCard({ icon, title, text }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7">
      <div className="text-blue-400 mb-4">{icon}</div>
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      <p className="text-slate-300 leading-8">{text}</p>
    </div>
  );
}