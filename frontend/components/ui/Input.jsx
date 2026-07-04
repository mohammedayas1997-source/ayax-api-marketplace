export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  readOnly = false,
}) {
  return (
    <div>
      {label && <label className="text-sm text-slate-400">{label}</label>}

      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
        {icon && <span className="text-slate-500">{icon}</span>}

        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}