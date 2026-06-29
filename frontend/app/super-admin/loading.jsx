export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>

        <h2 className="text-2xl font-bold text-white">
          Loading Super Admin...
        </h2>

        <p className="text-slate-400">
          Please wait while we prepare your dashboard.
        </p>
      </div>
    </div>
  );
}