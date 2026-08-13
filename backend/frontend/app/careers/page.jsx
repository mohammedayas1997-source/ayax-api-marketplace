import Link from "next/link";
import {
  Briefcase,
  Users,
  Code2,
  Globe2,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const openings = [
  "Frontend Developer",
  "Backend Developer",
  "API Integration Specialist",
  "Customer Support Officer",
  "Business Development Executive",
  "Digital Marketing Specialist",
];

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-full mb-6">
          <Briefcase size={16} />
          Careers
        </div>

        <h1 className="text-5xl font-extrabold mb-6">
          Build the future of digital APIs with us.
        </h1>

        <p className="text-slate-300 leading-8 text-lg max-w-3xl">
          Ayax Digital Solutions is building technology that helps developers,
          businesses and resellers access secure digital service APIs. We are
          looking for passionate people who want to grow with us.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
        <Card
          icon={<Code2 />}
          title="Engineering"
          text="Work on APIs, dashboards, integrations, automation and scalable backend systems."
        />

        <Card
          icon={<Users />}
          title="Customer Success"
          text="Support developers, businesses and partners using Ayax API Marketplace."
        />

        <Card
          icon={<Globe2 />}
          title="Growth"
          text="Help us expand partnerships, onboard businesses and grow our digital ecosystem."
        />
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-6">
            Possible Open Roles
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {openings.map((role) => (
              <div
                key={role}
                className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-5"
              >
                <CheckCircle className="text-blue-400" />
                <span>{role}</span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-7 py-4 rounded-2xl font-semibold"
            >
              Contact Us About Careers <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ icon, title, text }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7">
      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-5">
        {icon}
      </div>

      <h2 className="text-2xl font-bold mb-3">{title}</h2>

      <p className="text-slate-300 leading-8">{text}</p>
    </div>
  );
}