"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">

        <div className="w-24 h-24 mx-auto rounded-3xl bg-red-500/10 flex items-center justify-center mb-8">
          <AlertOctagon size={48} className="text-red-500" />
        </div>

        <h1 className="text-5xl font-extrabold mb-5">
          Something went wrong
        </h1>

        <p className="text-slate-400 text-lg leading-8 max-w-xl mx-auto">
          An unexpected error occurred while processing your request.
          Please try again. If the problem continues, contact Ayax
          Digital Solutions support.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">

          <button
            onClick={() => reset()}
            className="bg-blue-600 hover:bg-blue-700 px-7 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Try Again
          </button>

          <Link
            href="/"
            className="border border-slate-700 hover:border-blue-500 px-7 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Back to Home
          </Link>

        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-10 text-left bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-auto">
            <p className="text-red-400 font-semibold mb-3">
              Development Error
            </p>

            <pre className="text-xs text-slate-300 whitespace-pre-wrap">
              {error?.message}
            </pre>
          </div>
        )}

      </div>
    </main>
  );
}