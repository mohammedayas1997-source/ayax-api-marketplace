import Link from "next/link";
import Image from "next/image";
import {
  Code2,
  KeyRound,
  Wallet,
  Smartphone,
  Wifi,
  SearchCheck,
  Copy,
} from "lucide-react";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/data/buy",
    title: "Buy Data",
    desc: "Purchase internet data bundle for MTN, Airtel, Glo, and 9mobile.",
    body: `{
  "network": "MTN",
  "phone": "08012345678",
  "plan": "1GB",
  "reference": "AYAX-2026-0001"
}`,
  },
  {
    method: "POST",
    path: "/api/v1/airtime/buy",
    title: "Buy Airtime",
    desc: "Send airtime top-up to customer phone numbers instantly.",
    body: `{
  "network": "Airtel",
  "phone": "08012345678",
  "amount": 500,
  "reference": "AYAX-2026-0002"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/transaction/status/:reference",
    title: "Transaction Status",
    desc: "Check the live status of any transaction using your reference.",
    body: `GET /api/v1/transaction/status/AYAX-2026-0001`,
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/assets/logo.png"
            alt="Ayax Logo"
            width={44}
            height={44}
            priority
          />
          <div>
            <h2 className="text-xl font-bold">
              Ayax <span className="text-blue-500">APIs</span>
            </h2>
            <p className="text-xs text-slate-400">Developer Docs</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-slate-300">
            Pricing
          </Link>
          <Link
            href="/register"
            className="bg-blue-600 px-5 py-2 rounded-xl font-semibold"
          >
            Get API Key
          </Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-[280px_1fr] gap-8">
        <aside className="hidden lg:block bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit sticky top-6">
          <h3 className="font-bold mb-5">Documentation</h3>

          <div className="space-y-3 text-slate-300 text-sm">
            <a href="#overview" className="block hover:text-blue-400">
              Overview
            </a>
            <a href="#authentication" className="block hover:text-blue-400">
              Authentication
            </a>
            <a href="#wallet" className="block hover:text-blue-400">
              Wallet
            </a>
            <a href="#endpoints" className="block hover:text-blue-400">
              Endpoints
            </a>
            <a href="#responses" className="block hover:text-blue-400">
              Response Format
            </a>
          </div>
        </aside>

        <div className="space-y-10">
          <section id="overview" className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center gap-3 text-blue-400 mb-4">
              <Code2 />
              <span className="font-semibold">API Overview</span>
            </div>

            <h1 className="text-4xl font-extrabold mb-5">
              Ayax Developer API Documentation
            </h1>

            <p className="text-slate-400 leading-8">
              Ayax APIs allow developers and businesses to integrate telecom and
              VTU services directly into their websites, mobile apps, POS
              systems, and reseller platforms.
            </p>

            <div className="mt-6 bg-slate-950 rounded-2xl p-5 font-mono text-sm">
              <p className="text-green-400">Base URL</p>
              <code className="text-slate-300">
                https://api.ayaxdigital.solutions
              </code>
            </div>
          </section>

          <section id="authentication" className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center gap-3 text-blue-400 mb-4">
              <KeyRound />
              <span className="font-semibold">Authentication</span>
            </div>

            <h2 className="text-3xl font-bold mb-5">API Key Authentication</h2>

            <p className="text-slate-400 leading-8">
              Every request must include your API key in the request header.
            </p>

            <div className="mt-6 bg-slate-950 rounded-2xl p-5 font-mono text-sm overflow-x-auto">
              <pre className="text-slate-300">{`x-api-key: ayax_live_your_api_key_here
Content-Type: application/json`}</pre>
            </div>
          </section>

          <section id="wallet" className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center gap-3 text-blue-400 mb-4">
              <Wallet />
              <span className="font-semibold">Wallet System</span>
            </div>

            <h2 className="text-3xl font-bold mb-5">Wallet Deduction</h2>

            <p className="text-slate-400 leading-8">
              Your wallet is charged automatically for every successful API
              request. If your balance is low, the API will return insufficient
              balance response.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <Info icon={<Wifi />} title="Data API" text="₦5/request" />
              <Info icon={<Smartphone />} title="Airtime API" text="₦3/request" />
              <Info icon={<SearchCheck />} title="Status Check" text="₦1/request" />
            </div>
          </section>

          <section id="endpoints" className="space-y-6">
            <h2 className="text-3xl font-bold">API Endpoints</h2>

            {endpoints.map((item) => (
              <div
                key={item.path}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-8"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">{item.title}</h3>
                    <p className="text-slate-400 mt-2">{item.desc}</p>
                  </div>

                  <div className="bg-slate-950 rounded-xl px-4 py-2 font-mono text-sm">
                    <span
                      className={
                        item.method === "POST"
                          ? "text-green-400"
                          : "text-blue-400"
                      }
                    >
                      {item.method}
                    </span>{" "}
                    <span className="text-slate-300">{item.path}</span>
                  </div>
                </div>

                <div className="mt-6 bg-slate-950 rounded-2xl p-5 font-mono text-sm overflow-x-auto relative">
                  <Copy
                    size={18}
                    className="absolute top-5 right-5 text-slate-500"
                  />
                  <pre className="text-slate-300 whitespace-pre-wrap">
                    {item.body}
                  </pre>
                </div>
              </div>
            ))}
          </section>

          <section id="responses" className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <h2 className="text-3xl font-bold mb-5">Standard Response</h2>

            <div className="bg-slate-950 rounded-2xl p-5 font-mono text-sm overflow-x-auto">
              <pre className="text-slate-300">{`{
  "success": true,
  "message": "Transaction processing",
  "data": {
    "reference": "AYAX-2026-0001",
    "status": "processing"
  }
}`}</pre>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Info({ icon, title, text }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
      <div className="text-blue-400 mb-3">{icon}</div>
      <h4 className="font-bold">{title}</h4>
      <p className="text-slate-400 mt-2">{text}</p>
    </div>
  );
}