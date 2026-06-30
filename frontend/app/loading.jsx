export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-6" />

        <h1 className="text-2xl font-bold">
          Loading Ayax APIs...
        </h1>

        <p className="text-slate-400 mt-3">
          Please wait while we prepare your page.
        </p>
      </div>
    </main>
  );
}