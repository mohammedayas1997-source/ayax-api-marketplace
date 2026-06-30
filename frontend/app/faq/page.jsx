"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "What is Ayax API Marketplace?",
    answer:
      "Ayax API Marketplace is a platform that provides secure APIs for data, airtime, wallet services, transaction verification and other digital services for developers and businesses.",
  },
  {
    question: "How do I get an API Key?",
    answer:
      "Create a developer account, verify your profile, then generate an API key from your dashboard.",
  },
  {
    question: "How do I fund my wallet?",
    answer:
      "Log into your dashboard, navigate to Wallet, choose your preferred payment method and complete the funding process.",
  },
  {
    question: "Do you provide API documentation?",
    answer:
      "Yes. Comprehensive API documentation with request examples, responses, authentication and error codes is available in the Developer Docs section.",
  },
  {
    question: "Can I regenerate my API Key?",
    answer:
      "Yes. API keys can be regenerated from your dashboard. Your old key will immediately become invalid.",
  },
  {
    question: "How secure is Ayax API Marketplace?",
    answer:
      "We use JWT authentication, encrypted API keys, HTTPS, rate limiting, audit logs and continuous monitoring to secure the platform.",
  },
  {
    question: "Do you support businesses and enterprises?",
    answer:
      "Yes. We provide enterprise integrations, reseller accounts and custom API solutions for organizations.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can contact us through the Contact page, support ticket system or email our support team.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState(null);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-full mb-5">
            <HelpCircle size={16} />
            Frequently Asked Questions
          </div>

          <h1 className="text-5xl font-extrabold">
            Need Help?
          </h1>

          <p className="text-slate-300 mt-6 text-lg">
            Find answers to the most common questions about Ayax API Marketplace.
          </p>
        </div>

        <div className="space-y-5">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setOpen(open === index ? null : index)
                }
                className="w-full flex justify-between items-center px-6 py-5 text-left"
              >
                <span className="font-semibold text-lg">
                  {faq.question}
                </span>

                <ChevronDown
                  className={`transition ${
                    open === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === index && (
                <div className="px-6 pb-6 text-slate-300 leading-8">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}