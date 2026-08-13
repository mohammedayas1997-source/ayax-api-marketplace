"use client";

export default function Card({
  children,
  title,
  description,
  icon,
  actions,
  className = "",
}) {
  return (
    <section
      className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 ${className}`}
    >
      {(title || description || icon || actions) && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            {icon && <div className="text-blue-400">{icon}</div>}

            <div>
              {title && <h2 className="text-xl font-bold">{title}</h2>}

              {description && (
                <p className="text-slate-400 text-sm mt-2 leading-6">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && <div className="flex gap-3">{actions}</div>}
        </div>
      )}

      {children}
    </section>
  );
}