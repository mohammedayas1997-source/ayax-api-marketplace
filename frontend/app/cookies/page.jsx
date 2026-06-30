import {
  Cookie,
  Settings,
  ShieldCheck,
  BarChart3,
  Globe2,
  FileText,
} from "lucide-react";

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-full mb-6">
          <Cookie size={16} />
          Cookie Policy
        </div>

        <h1 className="text-5xl font-extrabold mb-6">
          Cookie Policy
        </h1>

        <p className="text-slate-300 leading-8 text-lg">
          This Cookie Policy explains how Ayax API Marketplace may use cookies
          and similar technologies to improve user experience, secure accounts,
          remember preferences and understand platform usage.
        </p>

        <p className="text-slate-500 mt-4">
          Last updated: June 2026
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 space-y-6">
        <Card
          icon={<Cookie />}
          title="What Are Cookies?"
          text="Cookies are small files stored on your device to help websites remember information about your visit, such as login sessions, preferences and security settings."
        />

        <Card
          icon={<ShieldCheck />}
          title="Essential Cookies"
          text="These cookies are required for login, authentication, dashboard access, security protection and basic platform functionality."
        />

        <Card
          icon={<Settings />}
          title="Preference Cookies"
          text="Preference cookies may be used to remember settings such as theme, dashboard preferences or user interface choices."
        />

        <Card
          icon={<BarChart3 />}
          title="Analytics Cookies"
          text="Analytics cookies may help us understand how users interact with Ayax API Marketplace so we can improve performance, features and documentation."
        />

        <Card
          icon={<Globe2 />}
          title="Third-Party Cookies"
          text="Some trusted third-party services such as payment processors, analytics providers or infrastructure tools may use cookies according to their own policies."
        />

        <Card
          icon={<FileText />}
          title="Managing Cookies"
          text="You can control or delete cookies through your browser settings. Disabling some cookies may affect login, dashboard access or platform functionality."
        />
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