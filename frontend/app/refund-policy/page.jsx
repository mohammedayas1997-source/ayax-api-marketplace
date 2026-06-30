import {
  RefreshCcw,
  Wallet,
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle,
} from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-full mb-6">
          <RefreshCcw size={16} />
          Refund Policy
        </div>

        <h1 className="text-5xl font-extrabold mb-6">
          Refund Policy
        </h1>

        <p className="text-slate-300 leading-8 text-lg">
          This Refund Policy explains when refunds are available,
          how refund requests are processed and the responsibilities
          of both Ayax Digital Solutions and our customers.
        </p>

        <p className="text-slate-500 mt-4">
          Last Updated: June 2026
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 space-y-6">

        <Card
          icon={<Wallet />}
          title="Wallet Funding"
          text="Wallet funding is generally non-refundable after payment has been confirmed. However, duplicate payments or system errors may qualify for review."
        />

        <Card
          icon={<CheckCircle />}
          title="Successful Transactions"
          text="Transactions successfully delivered to the requested destination cannot be refunded."
        />

        <Card
          icon={<AlertTriangle />}
          title="Failed Transactions"
          text="If a transaction fails due to a verified system error and the customer is charged, the amount will normally be reversed automatically or refunded after investigation."
        />

        <Card
          icon={<ShieldCheck />}
          title="Fraud Prevention"
          text="Refund requests involving fraud, abuse, chargeback manipulation, false claims or unauthorized activities may be rejected."
        />

        <Card
          icon={<Clock />}
          title="Refund Processing Time"
          text="Approved refunds are normally processed within 1–7 business days depending on the payment provider and banking system."
        />

        <div className="bg-blue-600 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-4">
            Need Help?
          </h2>

          <p className="leading-8 text-blue-100">
            If you believe a transaction was processed incorrectly,
            please open a support ticket with your Transaction ID,
            payment reference and a detailed explanation.
          </p>
        </div>

      </section>
    </main>
  );
}

function Card({ icon, title, text }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7">
      <div className="text-blue-400 mb-4">
        {icon}
      </div>

      <h2 className="text-2xl font-bold mb-3">
        {title}
      </h2>

      <p className="text-slate-300 leading-8">
        {text}
      </p>
    </div>
  );
}