export default function StatCard({ title, value, icon, desc }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-5">{icon}</div>
      <p className="text-slate-400 text-sm">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
      {desc && <p className="text-slate-500 text-sm mt-3">{desc}</p>}
    </div>
  );
}