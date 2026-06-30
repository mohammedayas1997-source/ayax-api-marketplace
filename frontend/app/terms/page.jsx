import Link from "next/link";
import {
  FileText,
  KeyRound,
  Wallet,
  ShieldAlert,
  Ban,
  Scale,
} from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full mb-6 text-sm">
          <Scale size={16} />
          Terms of Service
        </div>

        <h1 className="text-5xl font-extrabold mb-6">
          Terms for using Ayax API Marketplace.
        </h1>

        <p className="text-slate-300 leading-8 text-lg">
          By creating an account or using Ayax APIs, you agree to these terms.
          These terms govern developer accounts, API keys, wallet funding,
          transactions, documentation, and all services provided by Ayax Digital
          Solutions.
        </p>

        <p className="text-slate-500 mt-4">Last updated: June 2026</p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 space-y-6">
        <TermCard
          icon={<FileText />}
          title="Account Responsibility"
          text="You are responsible for maintaining accurate account information and protecting your login credentials. Activities performed through your account may be treated as authorized by you."
        />

        <TermCard
          icon={<KeyRound />}
          title="API Key Usage"
          text="API keys must be kept confidential. You must not share, sell, expose or misuse API keys. Ayax may revoke or disable API keys where abuse, fraud, security risk or policy violation is detected."
        />

        <TermCard
          icon={<Wallet />}
          title="Wallet and Transactions"
          text="Wallet funding, deductions and transaction records are processed through the platform. You are responsible for confirming details such as phone numbers, service plans and transaction references before submitting API requests."
        />

        <TermCard
          icon={<ShieldAlert />}
          title="Security and Monitoring"
          text="Ayax may monitor API usage, request logs, IP addresses and transaction activity to protect the platform, prevent fraud, troubleshoot issues and comply with legal or operational requirements."
        />

        <TermCard
          icon={<Ban />}
          title="Prohibited Activities"
          text="You must not use Ayax APIs for fraud, spam, illegal transactions, unauthorized access, abuse of telecom services, system attacks, scraping, resale violations or activities that harm users, providers or Ayax Digital Solutions."
        />

        <TermCard
          icon={<Scale />}
          title="Service Availability"
          text="We work to provide reliable services, but API availability may depend on third-party providers, telecom networks, payment processors, infrastructure and maintenance. Ayax is not liable for delays caused by external providers."
        />

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-2xl font-bold mb-4">Questions?</h2>
          <p className="text-slate-300 leading-8">
            Contact our support team if you need clarification about these
            terms or your account obligations.
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

function TermCard({ icon, title, text }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7">
      <div className="text-blue-400 mb-4">{icon}</div>
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      <p className="text-slate-300 leading-8">{text}</p>
    </div>
  );
}