import Link from "next/link";
import {
  ArrowRight,
  Code2,
  ShieldCheck,
  Wallet,
  Activity,
  Users,
  Globe2,
  CheckCircle,
} from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full mb-6 text-sm">
            <Globe2 size={16} />
            About Ayax APIs
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
            Building the future of developer-powered digital services.
          </h1>

          <p className="text-slate-300 mt-6 text-lg leading-8">
            Ayax API Marketplace is a professional platform built by Ayax
            Digital Solutions to help developers, businesses, resellers and
            digital service providers access reliable telecom, wallet and
            transaction APIs from one secure place.
          </p>

          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-7 py-4 rounded-2xl font-semibold"
            >
              Start Building <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-6">
        <Card
          icon={<Code2 />}
          title="Developer First"
          text="We provide clean, secure and scalable APIs that developers can integrate quickly."
        />
        <Card
          icon={<Wallet />}
          title="Business Ready"
          text="Our wallet, transaction and pricing systems are designed for real business operations."
        />
        <Card
          icon={<ShieldCheck />}
          title="Secure Platform"
          text="We use authentication, API keys, validation and activity monitoring to protect users."
        />
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-10">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-5">Our Mission</h2>
          <p className="text-slate-300 leading-8">
            Our mission is to make digital service APIs easier, safer and more
            accessible for African developers and businesses. We want businesses
            to launch faster, automate transactions and scale with confidence.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-5">Our Vision</h2>
          <p className="text-slate-300 leading-8">
            Our vision is to become a trusted API infrastructure company that
            connects developers to telecom, fintech and digital service systems
            through one professional marketplace.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-8">Why Choose Ayax APIs?</h2>

        <div className="grid md:grid-cols-2 gap-5">
          {[
            "Secure API key management",
            "Wallet funding and auto-deduction",
            "Real-time transaction monitoring",
            "Developer-friendly documentation",
            "Admin control and audit logs",
            "Designed for VTU, telecom and business automation",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-5"
            >
              <CheckCircle className="text-blue-400" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-blue-600 rounded-3xl p-10 text-center">
          <Activity className="mx-auto mb-5" size={40} />
          <h2 className="text-3xl font-extrabold">
            Ready to build with Ayax APIs?
          </h2>
          <p className="mt-4 text-blue-100">
            Create a developer account and start integrating reliable digital
            service APIs.
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-2 mt-8 bg-white text-blue-700 px-7 py-4 rounded-2xl font-bold"
          >
            Create Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function Card({ icon, title, text }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-7">{text}</p>
    </div>
  );
}