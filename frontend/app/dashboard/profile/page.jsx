import Link from "next/link";
import Image from "next/image";
import { User, Mail, Phone, Globe, Building2, Save } from "lucide-react";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <aside className="hidden lg:flex w-72 min-h-screen bg-slate-900 border-r border-slate-800 p-6 flex-col">
          <Link href="/" className="text-2xl font-extrabold mb-10">
            Ayax <span className="text-blue-500">APIs</span>
          </Link>

          <nav className="space-y-3 text-slate-300">
            <Link href="/dashboard" className="block hover:bg-slate-800 px-4 py-3 rounded-xl">
              Dashboard
            </Link>
            <Link href="/dashboard/wallet" className="block hover:bg-slate-800 px-4 py-3 rounded-xl">
              Wallet
            </Link>
            <Link href="/dashboard/api-keys" className="block hover:bg-slate-800 px-4 py-3 rounded-xl">
              API Keys
            </Link>
            <Link href="/dashboard/transactions" className="block hover:bg-slate-800 px-4 py-3 rounded-xl">
              Transactions
            </Link>
            <Link href="/dashboard/usage" className="block hover:bg-slate-800 px-4 py-3 rounded-xl">
              Usage Stats
            </Link>
            <Link href="/dashboard/profile" className="block bg-blue-600 text-white px-4 py-3 rounded-xl">
              Profile Settings
            </Link>
            <Link href="/docs" className="block hover:bg-slate-800 px-4 py-3 rounded-xl">
              API Docs
            </Link>
          </nav>
        </aside>

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold">Profile Settings</h1>
            <p className="text-slate-400 mt-2">
              Manage your developer account and business profile.
            </p>
          </div>

          <div className="grid xl:grid-cols-[0.8fr_1.2fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit">
              <div className="flex flex-col items-center text-center">
                <Image
                  src="/assets/logo.png"
                  alt="Ayax Logo"
                  width={90}
                  height={90}
                  className="rounded-3xl"
                />

                <h2 className="text-2xl font-bold mt-5">
                  Ayax Digital Solutions
                </h2>

                <p className="text-slate-400 mt-2">
                  Developer API Marketplace Account
                </p>

                <span className="mt-5 bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm">
                  Verified Business
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-6">Account Information</h2>

              <form className="space-y-5">
                <Input icon={<User size={18} />} label="Full Name" placeholder="Abdulrahman Mohammed Ayas" />
                <Input icon={<Building2 size={18} />} label="Company Name" placeholder="Ayax Digital Solutions" />
                <Input icon={<Mail size={18} />} label="Company Email" placeholder="admin@ayaxdigital.solutions" type="email" />
                <Input icon={<Phone size={18} />} label="Phone Number" placeholder="+234 000 000 0000" type="tel" />
                <Input icon={<Globe size={18} />} label="Company Website" placeholder="https://ayaxdigital.solutions" type="url" />

                <button
                  type="button"
                  className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Input({ icon, label, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
        <span className="text-slate-500">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}