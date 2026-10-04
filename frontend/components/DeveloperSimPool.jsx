/**
 * DeveloperSimPool.js
 * Frontend Component / Vanilla JS Module for Developer Portal
 * Path: public/js/developerSimPool.js (ko src/components/DeveloperSimPool.js)
 *
 * Yana gudanar da dukkan tsarin:
 * - Nuna Plan IDs da zabar Plan
 * - Nuna SIMs da ke Available (Kyauta) ba tare da sun shiga wani Plan ba
 * - Nuna Data Balance da Airtime Balance na kowane SIM
 * - Zabar SIMs ko da sun kai 1,000+ ba tare da matsala ba
 */

class DeveloperSimPoolManager {
  constructor(containerId, apiBaseUrl = "/api/v1") {
    this.container = document.getElementById(containerId);
    this.apiBase = apiBaseUrl.replace(/\/+$/, "");
    this.rawSimMatrix = [];
    this.availablePlans = [];
    this.selectedPlanId = null;
    this.selectedSimsForAction = new Set();
    this.currentActiveFilter = "AVAILABLE"; // 'AVAILABLE', 'CURRENT', 'ALL'
    this.searchQuery = "";

    if (this.container) {
      this.init();
    }
  }

  async init() {
    this.renderLayout();
    this.bindEvents();
    await this.loadPlans();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="sim-pool-wrapper" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 16px 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 900; margin: 0;">Developer Gateway SIM Pool & Plan Mapping</h3>
            <p style="font-size: 12px; color: #64748b; margin: 2px 0 0;">Dedicated SIM Pools • Filter Available Only • Live Data & Airtime Balances</p>
          </div>
          <span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 11px;">
            Unlimited SIMs Allowed
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 320px 1fr; gap: 16px;">
          <!-- 1. Left: Plans List -->
          <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <strong style="font-size: 14px;">Select Plan ID</strong>
              <button id="btnReloadPlans" style="border: none; background: none; color: #0284c7; cursor: pointer; font-weight: bold;">Reload</button>
            </div>
            <div id="poolPlansList" style="max-height: 480px; overflow-y: auto;">
              <div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 12px;">Loading plans...</div>
            </div>
          </div>

          <!-- 2. Right: SIM Selection Table -->
          <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <span style="font-size: 13px; color: #64748b;">Target Plan:</span>
                <strong id="labelTargetPlan" style="font-size: 14px; color: #0284c7;">Select a Plan</strong>
              </div>
              <span id="labelPoolSimCount" style="font-size: 12px; font-weight: 800; color: #10b981;">0 SIMs in Pool</span>
            </div>

            <!-- Filters -->
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <button class="pool-filter-btn active" data-filter="AVAILABLE" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #0284c7; background: #0284c7; color: #fff; font-size: 11.5px; font-weight: bold; cursor: pointer;">
                Available Only (Kyauta)
              </button>
              <button class="pool-filter-btn" data-filter="CURRENT" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; color: #475569; font-size: 11.5px; font-weight: bold; cursor: pointer;">
                In This Plan Pool
              </button>
              <button class="pool-filter-btn" data-filter="ALL" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; color: #475569; font-size: 11.5px; font-weight: bold; cursor: pointer;">
                All SIMs (Duka)
              </button>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <input type="text" id="inputSearchSims" placeholder="Search phone, balance (e.g. 8GB), or sync ID..." style="flex: 1; height: 38px; border-radius: 8px; border: 1px solid #cbd5e1; padding: 0 10px; font-size: 12.5px; outline: none;">
              <button id="btnSelectAllFiltered" style="height: 38px; padding: 0 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f1f5f9; font-weight: bold; font-size: 12px; cursor: pointer;">Select All Visible</button>
            </div>

            <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0;">
                    <th style="padding: 8px 10px; text-align: left; width: 35px;"><input type="checkbox" id="chkMasterSim"></th>
                    <th style="padding: 8px 10px; text-align: left;">Phone</th>
                    <th style="padding: 8px 10px; text-align: left;">Data Balance</th>
                    <th style="padding: 8px 10px; text-align: left;">Airtime</th>
                    <th style="padding: 8px 10px; text-align: left;">Status / Bound</th>
                  </tr>
                </thead>
                <tbody id="tableBodySims">
                  <tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">Loading SIMs...</td></tr>
                </tbody>
              </table>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px;">
              <span style="font-size: 11.5px; color: #64748b;">Selected: <strong id="countSelectedAction">0</strong> SIM(s)</span>
              <div style="display: flex; gap: 8px;">
                <button id="btnAddSimsToPool" style="height: 38px; padding: 0 16px; border-radius: 8px; border: none; background: #10b981; color: #fff; font-weight: bold; font-size: 12px; cursor: pointer;">
                  + ADD TO POOL
                </button>
                <button id="btnReplaceSimsPool" style="height: 38px; padding: 0 16px; border-radius: 8px; border: none; background: #0284c7; color: #fff; font-weight: bold; font-size: 12px; cursor: pointer;">
                  SAVE DEDICATED POOL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelector("#btnReloadPlans").addEventListener("click", () => this.loadPlans());

    this.container.querySelectorAll(".pool-filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.container.querySelectorAll(".pool-filter-btn").forEach((b) => {
          b.style.background = "#f8fafc";
          b.style.borderColor = "#cbd5e1";
          b.style.color = "#475569";
        });
        e.target.style.background = "#0284c7";
        e.target.style.borderColor = "#0284c7";
        e.target.style.color = "#ffffff";
        this.currentActiveFilter = e.target.getAttribute("data-filter");
        this.renderSimTable();
      });
    });

    const searchInput = this.container.querySelector("#inputSearchSims");
    searchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderSimTable();
    });

    this.container.querySelector("#btnSelectAllFiltered").addEventListener("click", () => this.toggleSelectAllVisible());
    this.container.querySelector("#chkMasterSim").addEventListener("change", () => this.toggleSelectAllVisible());

    this.container.querySelector("#btnAddSimsToPool").addEventListener("click", () => this.savePool("ADD"));
    this.container.querySelector("#btnReplaceSimsPool").addEventListener("click", () => this.savePool("REPLACE"));
  }

  async loadPlans() {
    try {
      const res = await fetch(`${this.apiBase}/data/plans`).then((r) => r.json());
      this.availablePlans = res.plans || res.data || [
        { planId: "mtn-tr-1gb-7days", name: "MTN 1GB (7 Days)", price: 400 },
        { planId: "mtn-tr-1gb", name: "MTN 1GB (30 Days)", price: 500 },
        { planId: "mtn-tr-2gb-7days", name: "MTN 2GB (7 Days)", price: 750 },
        { planId: "mtn-tr-500mb-7days", name: "MTN 500MB (7 Days)", price: 300 }
      ];

      this.renderPlansList();
      if (this.availablePlans.length > 0 && !this.selectedPlanId) {
        this.selectPlan(this.availablePlans[0].planId);
      }
    } catch (_) {}
  }

  renderPlansList() {
    const listEl = this.container.querySelector("#poolPlansList");
    listEl.innerHTML = this.availablePlans
      .map(
        (p) => `
        <div class="pool-plan-card" data-plan="${p.planId}" style="padding: 10px; border-radius: 8px; border: 1px solid ${this.selectedPlanId === p.planId ? "#0284c7" : "#e2e8f0"}; background: ${this.selectedPlanId === p.planId ? "#f0f9ff" : "#f8fafc"}; margin-bottom: 6px; cursor: pointer;">
          <div style="font-weight: bold; font-size: 13px; color: #0284c7; font-family: monospace;">${p.planId}</div>
          <div style="font-size: 11.5px; color: #334155; margin-top: 2px;">${p.name || p.planLabel || "Data Plan"} • ₦${p.price || p.userPrice || 0}</div>
          <div id="badgePool-${p.planId}" style="font-size: 10.5px; color: #10b981; font-weight: bold; margin-top: 4px;">Checking pool...</div>
        </div>
      `
      )
      .join("");

    listEl.querySelectorAll(".pool-plan-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-plan");
        this.selectPlan(id);
      });
    });
  }

  async selectPlan(planId) {
    this.selectedPlanId = planId;
    this.container.querySelector("#labelTargetPlan").innerText = planId;
    this.renderPlansList();
    this.selectedSimsForAction.clear();

    try {
      const res = await fetch(`${this.apiBase}/gateway/plan-pool/availability?planId=${planId}`).then((r) => r.json());
      this.rawSimMatrix = res.sims || [];

      const inPool = this.rawSimMatrix.filter((s) => s.isCurrentPlanPool);
      this.container.querySelector("#labelPoolSimCount").innerText = `${inPool.length} SIMs in Pool`;

      const badge = this.container.querySelector(`#badgePool-${planId}`);
      if (badge) badge.innerText = `${inPool.length} Dedicated SIMs`;

      this.renderSimTable();
    } catch (_) {}
  }

  renderSimTable() {
    const tbody = this.container.querySelector("#tableBodySims");
    const filtered = this.rawSimMatrix.filter((sim) => {
      if (this.currentActiveFilter === "AVAILABLE" && !sim.isAvailableForTarget) return false;
      if (this.currentActiveFilter === "CURRENT" && !sim.isCurrentPlanPool) return false;

      const phone = String(sim.phone || "");
      const dataBal = String(sim.dataBalance || "").toLowerCase();
      return !this.searchQuery || phone.includes(this.searchQuery) || dataBal.includes(this.searchQuery);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">No SIM cards matching filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((sim) => {
        const isChecked = this.selectedSimsForAction.has(sim.phone) || sim.isCurrentPlanPool;

        let badge = `<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">Available (Kyauta)</span>`;
        if (sim.isCurrentPlanPool) {
          badge = `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">In This Pool</span>`;
        } else if (sim.assignedPlanId) {
          badge = `<span style="background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">Bound: [${sim.assignedPlanId}]</span>`;
        }

        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 10px;"><input type="checkbox" class="chk-sim-row" data-phone="${sim.phone}" ${isChecked ? "checked" : ""}></td>
          <td style="padding: 8px 10px;"><strong>${sim.phone}</strong></td>
          <td style="padding: 8px 10px; color: #10b981; font-weight: bold;">${sim.dataBalance || "0.00GB"}</td>
          <td style="padding: 8px 10px; color: #0284c7; font-weight: bold;">${sim.airtimeBalance || "NGN 0.00"}</td>
          <td style="padding: 8px 10px;">${badge}</td>
        </tr>
      `;
      })
      .join("");

    tbody.querySelectorAll(".chk-sim-row").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const phone = e.target.getAttribute("data-phone");
        if (e.target.checked) this.selectedSimsForAction.add(phone);
        else this.selectedSimsForAction.delete(phone);
        this.container.querySelector("#countSelectedAction").innerText = this.selectedSimsForAction.size;
      });
    });

    this.container.querySelector("#countSelectedAction").innerText = this.selectedSimsForAction.size;
  }

  toggleSelectAllVisible() {
    const filtered = this.rawSimMatrix.filter((sim) => {
      if (this.currentActiveFilter === "AVAILABLE" && !sim.isAvailableForTarget) return false;
      if (this.currentActiveFilter === "CURRENT" && !sim.isCurrentPlanPool) return false;
      return !this.searchQuery || String(sim.phone).includes(this.searchQuery);
    });

    const allChecked = filtered.every((s) => this.selectedSimsForAction.has(s.phone));
    filtered.forEach((s) => {
      if (allChecked) this.selectedSimsForAction.delete(s.phone);
      else this.selectedSimsForAction.add(s.phone);
    });

    this.renderSimTable();
  }

  async savePool(actionType) {
    if (!this.selectedPlanId) {
      alert("Please select a Data Plan first.");
      return;
    }

    const phones = Array.from(this.selectedSimsForAction);
    if (phones.length === 0 && actionType !== "REPLACE") {
      alert("Please select at least one SIM to add.");
      return;
    }

    try {
      const res = await fetch(`${this.apiBase}/gateway/plan-pool/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: this.selectedPlanId,
          simPhones: phones,
          action: actionType,
        }),
      }).then((r) => r.json());

      if (res.success) {
        alert(`Success! Updated pool for [${this.selectedPlanId}]. Total Dedicated SIMs: ${res.totalAssigned}`);
        this.selectPlan(this.selectedPlanId);
      } else {
        alert(res.message || "Failed to update pool.");
      }
    } catch (e) {
      alert("Network Error: " + e.message);
    }
  }
}

// Global initialization helper
if (typeof window !== "undefined") {
  window.DeveloperSimPoolManager = DeveloperSimPoolManager;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = DeveloperSimPoolManager;
}
