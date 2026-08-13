"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export default function Pagination({
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
}) {
  const start =
    totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;

  const end = Math.min(page * pageSize, totalRecords);

  const goTo = (value) => {
    if (value < 1 || value > totalPages) return;
    onPageChange?.(value);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-t border-slate-800 pt-5">

      <p className="text-sm text-slate-500">
        Showing <span className="text-white">{start}</span> -
        <span className="text-white"> {end}</span> of{" "}
        <span className="text-white">{totalRecords}</span> records
      </p>

      <div className="flex items-center gap-2">

        <button
          onClick={() => goTo(1)}
          disabled={page === 1}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 p-2 rounded-xl"
        >
          <ChevronsLeft size={18} />
        </button>

        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 p-2 rounded-xl"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="px-4 py-2 rounded-xl bg-blue-600 font-semibold">
          {page}
        </span>

        <span className="text-slate-500">
          /
        </span>

        <span className="px-4 py-2 rounded-xl bg-slate-800">
          {totalPages}
        </span>

        <button
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 p-2 rounded-xl"
        >
          <ChevronRight size={18} />
        </button>

        <button
          onClick={() => goTo(totalPages)}
          disabled={page === totalPages}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 p-2 rounded-xl"
        >
          <ChevronsRight size={18} />
        </button>

      </div>
    </div>
  );
}