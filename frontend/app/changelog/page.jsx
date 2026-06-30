import {
  History,
  Rocket,
  ShieldCheck,
  Wallet,
  Code2,
  Activity,
} from "lucide-react";

const releases = [
  {
    version: "v1.0.0",
    date: "June 2026",
    title: "Initial Ayax API Marketplace Release",
    items: [
      "Developer account registration and login",
      "API key generation and management",
      "Wallet funding and balance tracking",
      "Data and airtime API marketplace foundation",
      "Super Admin dashboard and management modules",
    ],
    icon: <Rocket />,
  },
  {
    version: "v1.1.0",
    date: "Coming Soon",
    title: "Advanced Monitoring & Webhooks",
    items: [
      "Webhook delivery logs",
      "API usage analytics",
      "Realtime transaction notifications",
      "Provider health monitoring",
      "Improved audit logs",
    ],
    icon: <Activity />,
  },
  {
    version: "v1.2.0",
    date: "Coming Soon",
    title: "Enterprise Security Improvements",
    items: [
      "Advanced rate limiting",
      "IP allowlist",
      "API key restrictions",
      "Enhanced fraud detection",
      "Admin approval workflow improvements",
    ],
    icon: <ShieldCheck />,
  },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-full mb-6">
          <History size={16} />
          Changelog
        </div>

        <h1 className="text-5xl font-extrabold mb-6">
          Product updates and release notes.
        </h1>

        <p className="text-slate-300 leading-8 text-lg">
          Follow improvements, new features and platform updates for Ayax API
          Marketplace.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 space-y-6">
        {releases.map((release) => (
          <div
            key={release.version}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-8"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                {release.icon}
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  {release.title}
                </h2>

                <p className="text-slate-400">
                  {release.version} — {release.date}
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-slate-300">
              {release.items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-blue-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="bg-blue-600 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <Code2 />
            <h2 className="text-2xl font-bold">Developer Roadmap</h2>
          </div>

          <p className="text-blue-100 leading-8">
            Future updates will include SDKs, API sandbox testing, provider
            routing, webhook retries, transaction dispute tools and enterprise
            billing controls.
          </p>
        </div>
      </section>
    </main>
  );
}