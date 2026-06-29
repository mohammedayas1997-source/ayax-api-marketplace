import {
  KeyRound,
  Copy,
  RefreshCcw,
  Trash2,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";

import DashboardSidebar from "@/components/DashboardSidebar";

const apiKeys = [
  {
    name: "Live API Key",
    key: "ayax_live_82d9f3a9139a1f65c9a93e8a5f4b2c88",
    status: "Active",
    created: "2026-06-17",
    usage: "12,480 calls",
  },
  {
    name: "Test API Key",
    key: "ayax_test_49d7a3b8c12e9f0012abc778",
    status: "Active",
    created: "2026-06-10",
    usage: "4,210 calls",
  },
];

export default function ApiKeysPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <DashboardSidebar active="api-keys" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
            <div>
              <h1 className="text-3xl font-extrabold">
                API Keys
              </h1>

              <p className="text-slate-400 mt-2">
                Generate, copy, regenerate, revoke and monitor your API keys.
              </p>
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2">
              <PlusCircle size={18} />
              Generate New Key
            </button>
          </div>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  API Key Security
                </h2>

                <p className="text-slate-400 mt-2 leading-7">
                  Never expose your live API key in frontend code. Always use it
                  from your backend server. If your key is leaked, regenerate it
                  immediately.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            {apiKeys.map((item) => (
              <div
                key={item.key}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
              >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <KeyRound className="text-blue-400" />

                      <h2 className="text-xl font-bold">
                        {item.name}
                      </h2>

                      <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs">
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-sm text-slate-300 break-all">
                      {item.key}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-4">
                      <span>Created: {item.created}</span>
                      <span>Usage: {item.usage}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:w-80">
                    <button className="bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <Copy size={17} />
                      Copy
                    </button>

                    <button className="bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <RefreshCcw size={17} />
                      Regenerate
                    </button>

                    <button className="bg-red-500/10 text-red-400 hover:bg-red-500/20 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <Trash2 size={17} />
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}