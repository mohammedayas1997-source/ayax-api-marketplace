import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Send,
} from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full mb-6 text-sm">
          <MessageCircle size={16} />
          Contact Ayax APIs
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold">
          We're here to help.
        </h1>

        <p className="text-slate-300 mt-6 max-w-3xl mx-auto text-lg leading-8">
          Whether you're a developer, business owner, reseller or enterprise
          customer, our team is ready to assist you with API integration,
          wallet issues, billing, technical support and partnerships.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24 grid lg:grid-cols-2 gap-10">
        {/* Contact Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-6">
            Send us a message
          </h2>

          <form className="space-y-5">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-blue-500"
            />

            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-blue-500"
            />

            <input
              type="text"
              placeholder="Company (Optional)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-blue-500"
            />

            <textarea
              rows={6}
              placeholder="How can we help you?"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 outline-none focus:border-blue-500"
            />

            <button
              className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold flex justify-center items-center gap-2"
            >
              <Send size={18} />
              Send Message
            </button>
          </form>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          <InfoCard
            icon={<Mail />}
            title="Email"
            value="support@ayaxdigital.solutions"
          />

          <InfoCard
            icon={<Phone />}
            title="Phone"
            value="+234 816 144 4444"
          />

          <InfoCard
            icon={<MapPin />}
            title="Office"
            value="Nigeria"
          />

          <InfoCard
            icon={<Clock />}
            title="Working Hours"
            value="Monday - Friday (8:00 AM - 6:00 PM)"
          />

          <div className="bg-blue-600 rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-4">
              Enterprise Support
            </h3>

            <p className="leading-8 text-blue-100">
              Need custom API integration, bulk services,
              reseller partnership or enterprise pricing?
              Contact our business team for a dedicated solution.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex gap-5">
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
        {icon}
      </div>

      <div>
        <h3 className="font-bold text-xl">
          {title}
        </h3>

        <p className="text-slate-300 mt-2">
          {value}
        </p>
      </div>
    </div>
  );
}