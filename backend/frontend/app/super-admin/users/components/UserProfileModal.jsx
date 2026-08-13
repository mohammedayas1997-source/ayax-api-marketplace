"use client";

import { X, Mail, Phone, Shield, Wallet, Calendar } from "lucide-react";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function UserProfileModal({
  open,
  user,
  onClose,
}) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              User Profile
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Complete account information
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-2 gap-6 p-6">

          <InfoCard
            icon={<Mail size={18} />}
            title="Email"
            value={user.email}
          />

          <InfoCard
            icon={<Phone size={18} />}
            title="Phone"
            value={user.phone || "-"}
          />

          <InfoCard
            icon={<Shield size={18} />}
            title="Role"
            value={user.role}
          />

          <InfoCard
            icon={<Wallet size={18} />}
            title="Wallet Balance"
            value={formatNaira(user.wallet?.balance)}
          />

          <InfoCard
            icon={<Calendar size={18} />}
            title="Status"
            value={user.status}
          />

          <InfoCard
            icon={<Calendar size={18} />}
            title="Joined"
            value={
              user.createdAt
                ? new Date(user.createdAt).toLocaleString()
                : "-"
            }
          />

        </div>

        {/* API Keys */}
        <div className="border-t border-slate-800 p-6">
          <h3 className="font-bold mb-4">
            API Keys
          </h3>

          {user.apiKeys?.length ? (
            <div className="space-y-3">
              {user.apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-4"
                >
                  <p className="font-semibold">
                    {key.name}
                  </p>

                  <p className="text-sm text-slate-400 break-all mt-1">
                    {key.key}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    {key.status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">
              No API Keys found.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 p-6">
          <button
            onClick={onClose}
            className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

function InfoCard({ icon, title, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center gap-2 text-blue-400">
        {icon}
        <span className="text-sm">{title}</span>
      </div>

      <p className="mt-3 font-semibold break-all">
        {value}
      </p>
    </div>
  );
}