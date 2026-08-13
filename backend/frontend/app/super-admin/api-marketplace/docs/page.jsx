"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  PlusCircle,
  Search,
  RefreshCcw,
  Edit,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import KpiGrid from "../../components/KpiGrid";
import ActionButton from "../../components/ActionButton";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import api from "@/lib/api";

const emptyForm = {
  title: "",
  slug: "",
  category: "GENERAL",
  status: "PUBLISHED",
  content: "",
};

export default function DocumentationPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadDocs = async () => {
    try {
      setLoading(true);

      const res = await api.get("/documentation", {
        params: search ? { search } : {},
      });

      setDocs(res.data.docs || []);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to load documentation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (doc) => {
    setEditing(doc);
    setForm({
      title: doc.title || "",
      slug: doc.slug || "",
      category: doc.category || "GENERAL",
      status: doc.status || "PUBLISHED",
      content: doc.content || "",
    });
    setFormOpen(true);
  };

  const saveDoc = async () => {
    try {
      if (editing) {
        await api.patch(`/documentation/${editing.id}`, form);
        setMessage("Documentation updated successfully.");
      } else {
        await api.post("/documentation", form);
        setMessage("Documentation created successfully.");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      loadDocs();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save documentation.");
    }
  };

  const removeDoc = async (doc) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;

    try {
      await api.delete(`/documentation/${doc.id}`);
      setMessage("Documentation deleted.");
      loadDocs();
    } catch (err) {
      setMessage(err.response?.data?.message || "Delete failed.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="API Documentation">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="API Documentation"
      description="Manage developer documentation."
    >
      {message && (
        <div className="mb-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-300">
          {message}
        </div>
      )}

      <KpiGrid
        items={[
          {
            title: "Documentation",
            value: docs.length,
            icon: <FileText />,
            color: "blue",
          },
        ]}
      />

      <div className="my-6 flex gap-4">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documentation..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>

        <ActionButton
          variant="secondary"
          icon={<RefreshCcw size={18} />}
          onClick={loadDocs}
        >
          Refresh
        </ActionButton>

        <ActionButton
          icon={<PlusCircle size={18} />}
          onClick={openCreate}
        >
          New Document
        </ActionButton>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400">
          <span>Title</span>
          <span>Slug</span>
          <span>Category</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {docs.length === 0 ? (
          <div className="p-8 text-slate-500">
            No documentation found.
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-5 gap-4 border-b border-slate-800 px-6 py-5"
            >
              <span>{doc.title}</span>

              <span>{doc.slug}</span>

              <span>{doc.category}</span>

              <span>{doc.status}</span>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(doc)}
                  className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() => removeDoc(doc)}
                  className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-bold">
              {editing ? "Edit Documentation" : "Create Documentation"}
            </h2>

            <div className="grid gap-4">
              <Input
                label="Title"
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
              />

              <Input
                label="Slug"
                value={form.slug}
                onChange={(v) => setForm({ ...form, slug: v })}
              />

              <Input
                label="Category"
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
              </select>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Content
                </label>

                <textarea
                  rows={12}
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-2xl bg-slate-800 px-5 py-3"
              >
                Cancel
              </button>

              <button
                onClick={saveDoc}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold"
              >
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
      />
    </div>
  );
}