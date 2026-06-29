"use client";

import Breadcrumb from "./Breadcrumb";

export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
}) {
  return (
    <div className="mb-8">
      {breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div>
          <h1 className="text-3xl font-extrabold">{title}</h1>

          {description && (
            <p className="text-slate-400 mt-2 leading-7">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}