"use client";

export default function LoadingSkeleton({
  title = "Loading data...",
  cards = 4,
  rows = 6,
}) {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-72 bg-slate-800 rounded-xl mb-3" />
        <div className="h-4 w-96 bg-slate-800 rounded-xl" />
      </div>

      <section
        className="grid gap-5"
        style={{
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        }}
      >
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
          >
            <div className="h-10 w-10 bg-slate-800 rounded-2xl mb-5" />
            <div className="h-4 w-28 bg-slate-800 rounded-xl mb-3" />
            <div className="h-8 w-36 bg-slate-800 rounded-xl" />
          </div>
        ))}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="h-6 w-60 bg-slate-800 rounded-xl mb-6" />

        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between gap-5">
                <div className="space-y-3">
                  <div className="h-4 w-52 bg-slate-800 rounded-xl" />
                  <div className="h-3 w-72 bg-slate-800 rounded-xl" />
                </div>

                <div className="h-9 w-28 bg-slate-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}