"use client";

export default function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  textarea = false,
  options = [],
}) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none resize-none"
        />
      ) : options.length > 0 ? (
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
        >
          {options.map((item) => (
            <option key={item.value || item} value={item.value || item}>
              {item.label || item}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
        />
      )}
    </div>
  );
}