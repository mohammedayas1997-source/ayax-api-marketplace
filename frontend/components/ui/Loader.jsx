export default function Loader({ text = "Loading..." }) {
  return (
    <div className="text-slate-400 py-6">
      {text}
    </div>
  );
}