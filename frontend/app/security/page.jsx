import {
  ShieldCheck,
  KeyRound,
  LockKeyhole,
  Activity,
  Server,
  FileSearch,
  Gauge,
  AlertTriangle,
} from "lucide-react";

const items = [
  {
    icon: <KeyRound />,
    title: "API Key Protection",
    text: "Developers use secure API keys for authenticated requests. Keys can be regenerated, disabled and monitored.",
  },
  {
    icon: <LockKeyhole />,
    title: "JWT Authentication",
    text: "User accounts are protected with token-based authentication and role-based access controls.",
  },
  {
    icon: <Gauge />,
    title: "Rate Limiting",
    text: "Requests can be limited to reduce abuse, prevent overload and protect provider infrastructure.",
  },
  {
    icon: <FileSearch />,
    title: "Audit Logs",
    text: "Important admin actions are logged for accountability, security review and dispute resolution.",
  },
  {
    icon: <Activity />,
    title: "Live Monitoring",
    text: "API activity, failed requests, transactions and system health can be monitored in real time.",
  },
  {
    icon: <Server />,
    title: "Infrastructure Security",
    text: "Ayax APIs are designed to run on secure cloud infrastructure with HTTPS and environment-based secrets.",
  },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-full mb-6">
          <ShieldCheck size={16} />
          Security Center
        </div>

        <h1 className="text-5xl font-extrabold mb-6">
          Security built for developers and businesses.
        </h1>

        <p className="text-slate-300 leading-8 text-lg max-w-3xl">
          Ayax API Marketplace is designed with security controls for accounts,
          API keys, wallet activity, transactions and admin operations.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-2 gap-6">
        {items.map((item) => (
          <div
            key={item.title}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-7"
          >
            <div className="text-blue-400 mb-4">{item.icon}</div>
            <h2 className="text-2xl font-bold mb-3">{item.title}</h2>
            <p className="text-slate-300 leading-8">{item.text}</p>
          </div>
        ))}

        <div className="md:col-span-2 bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-8 flex gap-4">
          <AlertTriangle className="text-yellow-400 shrink-0" />
          <p className="text-yellow-100 leading-8">
            Never expose your API keys in public repositories, frontend code,
            screenshots, browser console logs or shared documents.
          </p>
        </div>
      </section>
    </main>
  );
}