import Link from "next/link";
import Image from "next/image";
import { CheckCircle, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "₦0",
    desc: "For new developers testing Ayax APIs.",
    features: [
      "Free developer account",
      "API key generation",
      "Wallet dashboard",
      "Data API access",
      "Airtime API access",
      "Transaction status check",
    ],
  },
  {
    name: "Business",
    price: "₦5/request",
    desc: "For businesses processing daily VTU transactions.",
    featured: true,
    features: [
      "Everything in Starter",
      "Priority API routing",
      "Live transaction monitoring",
      "Usage analytics",
      "API logs",
      "Wallet auto deduction",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For large API resellers and fintech platforms.",
    features: [
      "Custom pricing",
      "Dedicated support",
      "Higher rate limits",
      "Bulk API access",
      "Admin reports",
      "Custom integration support",
    ],
  },
];

export default function PricingPage() {
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
            <p className="text-xs text-slate-400">Developer Marketplace</p>
          </div>
        </Link>

        <Link
          href="/register"
          className="bg-blue-600 px-5 py-2 rounded-xl font-semibold"
        >
          Get Started
        </Link>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-extrabold">
          Simple API Pricing for Developers
        </h1>
        <p className="text-slate-400 mt-5 max-w-2xl mx-auto text-lg">
          Pay only for what you use. Build, sell, and scale with Ayax telecom
          and VTU APIs.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-3xl p-8 border ${
              plan.featured
                ? "bg-blue-600 border-blue-400 scale-105"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className={plan.featured ? "text-blue-100 mt-3" : "text-slate-400 mt-3"}>
              {plan.desc}
            </p>

            <div className="mt-8">
              <span className="text-4xl font-extrabold">{plan.price}</span>
            </div>

            <ul className="mt-8 space-y-4">
              {plan.features.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className={`mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold ${
                plan.featured
                  ? "bg-white text-blue-700"
                  : "bg-slate-800 text-white"
              }`}
            >
              Start Now <ArrowRight size={18} />
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}