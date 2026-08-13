import Link from "next/link";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <div className="w-20 h-20 mx-auto bg-yellow-500/10 text-yellow-400 rounded-3xl flex items-center justify-center mb-8">
          <AlertTriangle size={42} />
        </div>

        <h1 className="text-7xl font-extrabold mb-4">404</h1>

        <h2 className="text-3xl font-bold mb-4">
          Page Not Found
        </h2>

        <p className="text-slate-400 leading-8 mb-8">
          The page you are looking for does not exist, has been moved,
          or the link may be incorrect.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Go Home
          </Link>

          <Link
            href="/contact"
            className="border border-slate-700 hover:border-blue-500 px-6 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}