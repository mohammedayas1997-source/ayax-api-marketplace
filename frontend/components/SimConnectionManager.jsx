"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Plus,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Server,
  Zap,
} from "lucide-react";

export default function SimConnectionManager({ apiBase = "/api/v1" }) {
  const [sims, setSims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = Phone Input, 2 = OTP Input
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchSims();
  }, []);

  const fetchSims = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/gateway/sims`);
      const data = await res.json();
      setSims(data.sims || data.planA_cloudSims || []);
    } catch (err) {
      console.error("Failed to fetch SIMs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${apiBase}/gateway/refresh-balances`, {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message || "All SIM balances successfully synchronized!");
      fetchSims();
    } catch (err) {
      alert("Balance sync error: " + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMessage("Please provide a valid MTN phone number.");
      return;
    }

    setRequestingOtp(true);
    setErrorMessage("");
    try {
      const res = await fetch(`${apiBase}/gateway/mtn/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionId || "");
        setStep(2);
        setSuccessMessage(`OTP has been dispatched to ${data.phone || phoneNumber}. Please check your SMS.`);
      } else {
        setErrorMessage(data.message || "Unable to request OTP from the network gateway.");
      }
    } catch (err) {
      setErrorMessage("Connection Error: " + err.message);
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setErrorMessage("Please enter the verification code sent via SMS.");
      return;
    }

    setVerifyingOtp(true);
    setErrorMessage("");
    try {
      const res = await fetch(`${apiBase}/gateway/mtn/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          otp: otpCode.trim(),
          sessionId,
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert("SIM card linked and authenticated successfully!");
        setIsModalOpen(false);
        resetModal();
        fetchSims();
      } else {
        setErrorMessage(data.message || "Invalid or expired OTP code.");
      }
    } catch (err) {
      setErrorMessage("Verification Error: " + err.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleDeleteSim = async (phone) => {
    if (!confirm(`Are you sure you want to disconnect SIM ${phone}?`)) return;
    try {
      const res = await fetch(`${apiBase}/gateway/sims/${phone}`, {
        method: "DELETE",
      });
      const data = await res.json();
      alert(data.message || "SIM connection removed.");
      fetchSims();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const resetModal = () => {
    setStep(1);
    setPhoneNumber("");
    setOtpCode("");
    setSessionId("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">
              MyMTN Cloud Gateway Connections
            </h2>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Zero-Fee Vending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Connect and authenticate unlimited MTN SIMs via OTP to dispense automated data bundles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync All Balances</span>
          </button>

          <button
            onClick={() => {
              resetModal();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Connection</span>
          </button>
        </div>
      </div>

      {/* Grid of Connected SIM Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400">
            Scanning active gateway connections...
          </div>
        ) : sims.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Smartphone className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No SIM Cards Linked Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click <strong>"Add Connection"</strong> to connect an MTN line using the official MyMTN Web OTP protocol.
            </p>
            <button
              onClick={() => {
                resetModal();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus className="h-4 w-4" /> Add SIM Now
            </button>
          </div>
        ) : (
          sims.map((sim) => (
            <div
              key={sim.phone}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              {/* Header Badge */}
              <div className="bg-indigo-950 text-white text-[10px] font-black tracking-wider uppercase text-center py-1">
                Active Gateway
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-base font-black text-slate-900">
                    {sim.phone}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {sim.status || "ACTIVE"}
                  </span>
                </div>

                {/* 3 Metric Boxes: Airtime, Data, Tariff */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Airtime</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">
                      {sim.airtimeBalance || "NGN 0.00"}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Data</span>
                    <span className="text-xs font-black text-emerald-600 block mt-0.5">
                      {sim.dataBalance || "0.00GB"}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Tariff</span>
                    <span className="text-xs font-black text-indigo-600 block mt-0.5 truncate">
                      {sim.tariff || "MTN X"}
                    </span>
                  </div>
                </div>

                {/* Sync ID & Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span className="text-[11px]">
                    Sync ID: <strong className="text-slate-700 font-mono">{sim.simId || "517551"}</strong>
                  </span>

                  <button
                    onClick={() => handleDeleteSim(sim.phone)}
                    title="Disconnect SIM"
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* POPUP MODAL: ADD CONNECTION VIA OTP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Add MTN Gateway Connection</h3>
                  <p className="text-[11px] text-slate-500">Enter your MTN number to authenticate via OTP</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="break-all">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {step === 1 ? (
                /* STEP 1: Phone Input */
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      MTN Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 08161444444 or 09033738409"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-medium"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ensure the SIM card is active and can receive inbound SMS.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={requestingOtp}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                  >
                    {requestingOtp ? "Dispatching OTP..." : "REQUEST OTP VIA SMS"}
                  </button>
                </form>
              ) : (
                /* STEP 2: OTP Verification */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Enter 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[11px] text-indigo-600 font-bold hover:underline"
                      >
                        Change Number
                      </button>
                    </div>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="e.g. 849201"
                      maxLength={8}
                      className="w-full px-3.5 py-2.5 text-center font-mono tracking-widest text-base font-bold border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingOtp}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                  >
                    {verifyingOtp ? "Authenticating Session..." : "VERIFY & LINK SIM"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}