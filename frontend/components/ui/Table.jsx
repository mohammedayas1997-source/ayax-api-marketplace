export default function Table({ headers = [], children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
      <div
        className="hidden xl:grid gap-4 border-b border-slate-800 px-6 py-4 text-sm text-slate-400 font-semibold"
        style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}
      >
        {headers.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {children}
    </div>
  );
}

export function TableRow({ columns = [] }) {
  return (
    <div
      className="grid gap-4 items-center px-6 py-5 border-b border-slate-800"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((col, index) => (
        <div key={index}>{col}</div>
      ))}
    </div>
  );
}