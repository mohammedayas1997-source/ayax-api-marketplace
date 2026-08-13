export default function EmptyState({ title = "No data found", description }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
      <h3 className="text-xl font-bold">{title}</h3>
      {description && <p className="text-slate-400 mt-2">{description}</p>}
    </div>
  );
}