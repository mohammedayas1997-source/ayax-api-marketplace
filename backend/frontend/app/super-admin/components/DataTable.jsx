"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";

export default function DataTable({
  title = "Data Table",
  description = "Manage records",
  columns = [],
  data = [],
  searchKeys = [],
  onView,
  onEdit,
  onDelete,
  showExport = true,
  pageSize = 10,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!query) return data;

    const q = query.toLowerCase();

    return data.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [data, query, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const currentRows = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const exportCSV = () => {
    const headers = columns.map((col) => col.label).join(",");

    const rows = filteredData.map((row) =>
      columns
        .map((col) => `"${String(row[col.key] ?? "").replaceAll('"', '""')}"`)
        .join(",")
    );

    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replaceAll(" ", "_").toLowerCase()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-slate-800">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-slate-400 mt-1">{description}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
              <Search size={18} className="text-slate-500" />

              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search records..."
                className="bg-transparent py-3 outline-none text-white placeholder:text-slate-600"
              />
            </div>

            {showExport && (
              <button
                onClick={exportCSV}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold min-w-[1000px]"
          style={{
            gridTemplateColumns: `repeat(${columns.length + 1}, minmax(140px, 1fr))`,
          }}
        >
          {columns.map((col) => (
            <span key={col.key}>{col.label}</span>
          ))}

          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-800 min-w-[1000px]">
          {currentRows.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No records found.
            </div>
          ) : (
            currentRows.map((row, index) => (
              <div
                key={row.id || index}
                className="grid gap-4 px-6 py-5 items-center"
                style={{
                  gridTemplateColumns: `repeat(${columns.length + 1}, minmax(140px, 1fr))`,
                }}
              >
                {columns.map((col) => (
                  <div key={col.key} className="text-slate-300 text-sm break-all">
                    {col.render ? col.render(row) : row[col.key]}
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  {onView && (
                    <button
                      onClick={() => onView(row)}
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                    >
                      <Eye size={16} />
                    </button>
                  )}

                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 p-2 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                  )}

                  {onDelete && (
                    <button
                      onClick={() => onDelete(row)}
                      className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-2 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {!onView && !onEdit && !onDelete && (
                    <button className="bg-slate-800 p-2 rounded-lg">
                      <MoreVertical size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-5 border-t border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-sm text-slate-500">
          Showing {currentRows.length} of {filteredData.length} records
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-4 py-2 rounded-xl flex items-center gap-2"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}