import {
  Handshake,
  Server,
  Wallet,
  ShieldCheck,
  Globe2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const partners = [
  {
    title: "API Providers",
    text: "Telecom, VTU, payment and verification providers can connect their services to Ayax API Marketplace.",
    icon: <Server />,
  },
  {
    title: "Resellers",
    text: "Businesses can resell data, airtime and digital services using Ayax developer APIs.",
    icon: <Wallet />,
  },
  {
    title: "Enterprise Clients",
    text: "Organizations can request custom integrations, private pricing and dedicated support.",
    icon: <ShieldCheck />,
  },
];

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-full mb-6">
          <Handshake size={16} />
          Partners
        </div>

        <h1 className="text-5xl font-extrabold mb-6">
          Partner with Ayax API Marketplace.
        </h1>

        <p className="text-slate-300 leading-8 text-lg max-w-3xl">
          We work with API providers, resellers, businesses and enterprise
          clients to deliver reliable digital services through secure developer
          APIs.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
        {partners.map((item) => (
          <div
            key={item.title}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-7"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-5">
              {item.icon}
            </div>

            <h2 className="text-2xl font-bold mb-3">{item.title}</h2>

            <p className="text-slate-300 leading-8">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-blue-600 rounded-3xl p-10 text-center">
          <Globe2 className="mx-auto mb-5" size={42} />

          <h2 className="text-3xl font-extrabold">
            Want to become a partner?
          </h2>

          <p className="text-blue-100 mt-4 max-w-2xl mx-auto leading-8">
            Contact Ayax Digital Solutions for API provider onboarding,
            reseller partnership, enterprise integration or business
            collaboration.
          </p>

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 mt-8 bg-white text-blue-700 px-7 py-4 rounded-2xl font-bold"
          >
            Contact Partnership Team <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}