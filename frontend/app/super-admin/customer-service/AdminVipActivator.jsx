import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminVipActivator = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states don saita farashi yayin activation
  const [customMtnPrice, setCustomMtnPrice] = useState("");
  const [discountPerGb, setDiscountPerGb] = useState("30");

  const BASE_URL = process.env.REACT_APP_API_URL || "/api/v1";

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || localStorage.getItem("userToken");
      const res = await axios.get(`${BASE_URL}/private-tier/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load VIP requests", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token") || localStorage.getItem("userToken");

      const payload = {
        targetUserId: selectedUser.userId,
        customMtnPrice: customMtnPrice ? Number(customMtnPrice) : null,
        discountPerGb: discountPerGb ? Number(discountPerGb) : 30,
        action: "APPROVE",
      };

      const res = await axios.post(`${BASE_URL}/private-tier/admin/activate`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        alert(`Successfully activated ${selectedUser.userEmail} on Private Tier!`);
        setSelectedUser(null);
        setCustomMtnPrice("");
        fetchPendingRequests();
      }
    } catch (err) {
      alert("Activation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            Private API Tier Approvals
          </h2>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
            Whitelist customers for dedicated hidden wholesale rates
          </p>
        </div>
        <button
          onClick={fetchPendingRequests}
          style={{ background: "#0284c7", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}
        >
          Refresh List
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          No pending VIP API activation requests.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "12px" }}>User Email</th>
                <th style={{ padding: "12px" }}>API Key Provided</th>
                <th style={{ padding: "12px" }}>Requested At</th>
                <th style={{ padding: "12px" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px", fontWeight: "700", color: "#0f172a" }}>{item.userEmail}</td>
                  <td style={{ padding: "12px", fontFamily: "monospace", color: "#0369a1" }}>
                    {item.apiKey ? `${item.apiKey.slice(0, 10)}...${item.apiKey.slice(-5)}` : "None"}
                  </td>
                  <td style={{ padding: "12px", color: "#64748b" }}>
                    {new Date(item.requestedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "800",
                        background: item.isActive ? "#ecfdf5" : "#fef3c7",
                        color: item.isActive ? "#059669" : "#d97706",
                      }}
                    >
                      {item.isActive ? "ACTIVE VIP" : item.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <button
                      onClick={() => setSelectedUser(item)}
                      style={{
                        background: item.isActive ? "#475569" : "#059669",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "12px",
                      }}
                    >
                      {item.isActive ? "Edit Price" : "Configure & Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Activation Modal */}
      {selectedUser && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", width: "90%", maxWidth: "440px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "800" }}>Activate Private Routing</h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px 0" }}>User: {selectedUser.userEmail}</p>

            <form onSubmit={handleActivate}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                  FIXED MTN 1GB PRICE (₦) (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 220"
                  value={customMtnPrice}
                  onChange={(e) => setCustomMtnPrice(e.target.value)}
                  style={{ width: "100%", height: "40px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0 10px", fontSize: "13px" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "4px" }}>
                  DISCOUNT PER GB (₦) (Duk data da ya saya za a cire wannan ragin)
                </label>
                <input
                  type="number"
                  value={discountPerGb}
                  onChange={(e) => setDiscountPerGb(e.target.value)}
                  style={{ width: "100%", height: "40px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0 10px", fontSize: "13px" }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  style={{ flex: 1, height: "40px", background: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", color: "#64748b" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ flex: 2, height: "40px", background: "#059669", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", color: "#fff" }}
                >
                  {actionLoading ? "Activating..." : "Authorize & Activate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVipActivator;