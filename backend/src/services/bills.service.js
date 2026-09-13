const axios = require("axios");

// 1. DUBA WALLET BALANCE NA KOWANE PROVIDER
const getProviderBalances = async () => {
  const balances = {
    ALIHSAN: 0,
    SMARTSMS: 0,
    CLUBCONNECT: 0,
    BILALSADA: 0,
    GLOBECONNECT: 0,
    AJAH: 0,
    VTPASS: 0,
  };

  // Al-Ihsan Datasub
  const alihsanToken =
    process.env.ALIHSAN_AUTH_TOKEN ||
    process.env.ALIHSAN_API_KEY ||
    "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

  if (alihsanToken) {
    try {
      const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api/v1";
      const res = await axios.get(`${baseUrl}/user.php`, {
        headers: { Authorization: alihsanToken },
        timeout: 4000,
      });
      balances.ALIHSAN = Number(
        res.data?.user?.wallet_balance ||
        res.data?.wallet_balance ||
        res.data?.balance ||
        0
      );
    } catch (_) {
      balances.ALIHSAN = 0;
    }
  }

  // SmartSMS
  if (process.env.SMARTSMS_API_TOKEN) {
    try {
      const res = await axios.get(
        `https://smartsmssolutions.com/api/json.php?token=${process.env.SMARTSMS_API_TOKEN}&type=balance`,
        { timeout: 4000 }
      );
      balances.SMARTSMS = Number(res.data?.balance || 0);
    } catch (_) {
      balances.SMARTSMS = 0;
    }
  }

  // ClubConnect
  if (process.env.CLUBCONNECT_USER_ID && process.env.CLUBCONNECT_API_KEY) {
    try {
      const res = await axios.get(
        `https://www.clubconnect.com.ng/api/walletbalance?UserID=${process.env.CLUBCONNECT_USER_ID}&APIKey=${process.env.CLUBCONNECT_API_KEY}`,
        { timeout: 4000 }
      );
      balances.CLUBCONNECT = Number(res.data?.balance || res.data?.WalletBalance || 0);
    } catch (_) {
      balances.CLUBCONNECT = 0;
    }
  }

  // Bilalsadasub
  if (process.env.BILALSADA_API_TOKEN) {
    try {
      const res = await axios.get("https://bilalsadasub.com/api/user", {
        headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
        timeout: 4000,
      });
      balances.BILALSADA = Number(res.data?.user?.wallet_balance || res.data?.wallet || 0);
    } catch (_) {
      balances.BILALSADA = 0;
    }
  }

  // GlobeConnect
  if (process.env.GLOBECONNECT_API_KEY) {
    try {
      const res = await axios.get("https://api.globeconnect.ng/api/user/balance", {
        headers: { Authorization: `Bearer ${process.env.GLOBECONNECT_API_KEY}` },
        timeout: 4000,
      });
      balances.GLOBECONNECT = Number(res.data?.balance || res.data?.data?.balance || 0);
    } catch (_) {
      balances.GLOBECONNECT = 0;
    }
  }

  // Ajah
  if (process.env.AJAH_API_KEY) {
    try {
      const res = await axios.get("https://ajah.com.ng/api/user", {
        headers: { Authorization: `Token ${process.env.AJAH_API_KEY}` },
        timeout: 4000,
      });
      balances.AJAH = Number(res.data?.user?.wallet_balance || res.data?.balance || 0);
    } catch (_) {
      balances.AJAH = 0;
    }
  }

  // VTpass
  if (process.env.VTPASS_API_KEY && process.env.VTPASS_SECRET_KEY) {
    try {
      const res = await axios.get("https://api-service.vtpass.com/api/balance", {
        headers: {
          "api-key": process.env.VTPASS_API_KEY,
          "secret-key": process.env.VTPASS_SECRET_KEY,
        },
        timeout: 4000,
      });
      balances.VTPASS = Number(res.data?.contents?.balance || 0);
    } catch (_) {
      balances.VTPASS = 0;
    }
  }

  return balances;
};

// 2. DISPATCHER DON ELECTRICITY
exports.routeElectricity = async ({ disco, meterNo, meterType, amount, phone, reference }) => {
  const balances = await getProviderBalances();
  const errors = [];
  const normDisco = disco.toLowerCase().trim();
  const cleanPhone = phone || "08011111111";

  const hasAlIhsan = Boolean(
    process.env.ALIHSAN_AUTH_TOKEN ||
    process.env.ALIHSAN_API_KEY ||
    "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x"
  );

  const allProviders = [
    { name: "ALIHSAN", balance: balances.ALIHSAN, hasEnv: hasAlIhsan },
    { name: "SMARTSMS", balance: balances.SMARTSMS, hasEnv: Boolean(process.env.SMARTSMS_API_TOKEN) },
    { name: "CLUBCONNECT", balance: balances.CLUBCONNECT, hasEnv: Boolean(process.env.CLUBCONNECT_API_KEY) },
    { name: "BILALSADA", balance: balances.BILALSADA, hasEnv: Boolean(process.env.BILALSADA_API_TOKEN) },
    { name: "GLOBECONNECT", balance: balances.GLOBECONNECT, hasEnv: Boolean(process.env.GLOBECONNECT_API_KEY) },
    { name: "AJAH", balance: balances.AJAH, hasEnv: Boolean(process.env.AJAH_API_KEY) },
    { name: "VTPASS", balance: balances.VTPASS, hasEnv: Boolean(process.env.VTPASS_API_KEY) },
  ];

  let candidates = allProviders
    .filter((p) => p.hasEnv && p.balance >= amount)
    .map((p) => p.name);

  if (candidates.length === 0) {
    candidates = allProviders.filter((p) => p.hasEnv).map((p) => p.name);
  }

  for (const provider of candidates) {
    try {
      console.log(`⚡ [POWER DISPATCH]: Trying ${provider} for Meter ${meterNo}...`);

      // 0. AL-IHSAN DATASUB
      if (provider === "ALIHSAN") {
        const alihsanToken =
          process.env.ALIHSAN_AUTH_TOKEN ||
          process.env.ALIHSAN_API_KEY ||
          "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

        const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api/v1";

        const res = await axios.post(
          `${baseUrl}/electricity.php`,
          {
            disco_name: normDisco.toUpperCase(),
            meter_number: meterNo,
            meter_type: meterType.toUpperCase(),
            amount: Number(amount),
            customer_phone: cleanPhone,
            reference: reference,
          },
          {
            headers: {
              Authorization: alihsanToken,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 35000,
          }
        );

        const st = String(res.data?.status || "").toLowerCase();
        if (st === "success" || st === "successful" || res.data?.token) {
          return {
            provider: "ALIHSAN",
            token: res.data?.token || res.data?.meter_token || res.data?.purchased_code,
            units: res.data?.units || "",
            raw: res.data,
          };
        }
        throw new Error(res.data?.message || res.data?.error || "Al-Ihsan power dispatch failed");
      }

      // A. SMARTSMS
      if (provider === "SMARTSMS") {
        const res = await axios.post(
          "https://smartsmssolutions.com/api/json.php",
          {
            token: process.env.SMARTSMS_API_TOKEN,
            type: "electricity",
            disco: normDisco,
            meter: meterNo,
            meter_type: meterType.toLowerCase(),
            amount: Number(amount),
            phone: cleanPhone,
            ref: reference,
          },
          { timeout: 35000 }
        );
        if (res.data?.code === "1000" || res.data?.status === "success") {
          return {
            provider: "SMARTSMS",
            token: res.data.token || res.data.meter_token || res.data.purchased_code,
            units: res.data.units || "",
            raw: res.data,
          };
        }
        throw new Error(res.data?.message || "SmartSMS failed");
      }

      // B. CLUBCONNECT
      if (provider === "CLUBCONNECT") {
        const clubDiscoMap = {
          ikedc: "01",
          ekedc: "02",
          aedc: "03",
          kedco: "04",
          ibedc: "05",
          phed: "06",
          eedc: "07",
          yedc: "08",
        };
        const discoCode = clubDiscoMap[normDisco] || "01";
        const mType = meterType.toLowerCase() === "postpaid" ? "02" : "01";
        const url = `https://www.clubconnect.com.ng/api/billpayment?UserID=${process.env.CLUBCONNECT_USER_ID}&APIKey=${process.env.CLUBCONNECT_API_KEY}&ElectricCompany=${discoCode}&MeterNo=${meterNo}&MeterType=${mType}&Amount=${amount}&PhoneNo=${cleanPhone}&RequestID=${reference}`;

        const res = await axios.get(url, { timeout: 35000 });
        const st = String(res.data?.status || res.data?.statuscode || "").toLowerCase();
        if (st.includes("success") || st === "100" || st === "200" || res.data?.metertoken) {
          return {
            provider: "CLUBCONNECT",
            token: res.data?.metertoken || res.data?.token || res.data?.ReceiptNo,
            units: res.data?.units || "",
            raw: res.data,
          };
        }
        throw new Error(res.data?.msg || res.data?.status || "ClubConnect failed");
      }

      // C. BILALSADA
      if (provider === "BILALSADA") {
        const discoMap = { ikedc: 1, ekedc: 2, aedc: 3, kedco: 4, ibedc: 5, phed: 6, eedc: 7, yedc: 8 };
        const res = await axios.post(
          "https://bilalsadasub.com/api/billpayment",
          {
            disco: discoMap[normDisco] || 1,
            meter_number: meterNo,
            meter_type: meterType.toLowerCase(),
            amount: Number(amount),
            "request-id": reference,
          },
          {
            headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
            timeout: 35000,
          }
        );
        if (res.data?.status === "success" || res.data?.token) {
          return {
            provider: "BILALSADA",
            token: res.data.token || res.data.purchased_code,
            units: res.data.units || "",
            raw: res.data,
          };
        }
        throw new Error(res.data?.message || "Bilalsadasub failed");
      }

      // D. GLOBECONNECT
      if (provider === "GLOBECONNECT") {
        const res = await axios.post(
          "https://api.globeconnect.ng/api/electricity/pay",
          {
            disco: normDisco,
            meter_number: meterNo,
            meter_type: meterType.toLowerCase(),
            amount: Number(amount),
            phone: cleanPhone,
            reference,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.GLOBECONNECT_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 35000,
          }
        );
        if (res.data?.status === "success" || res.data?.token) {
          return {
            provider: "GLOBECONNECT",
            token: res.data.token || res.data.meter_token,
            units: res.data.units || "",
            raw: res.data,
          };
        }
        throw new Error(res.data?.message || "GlobeConnect failed");
      }

      // E. AJAH API
      if (provider === "AJAH") {
        const res = await axios.post(
          "https://ajah.com.ng/api/billpayment",
          {
            disco_name: normDisco,
            meter_number: meterNo,
            MeterType: meterType.toLowerCase(),
            amount: Number(amount),
            Customer_Phone: cleanPhone,
            ident: reference,
          },
          {
            headers: {
              Authorization: `Token ${process.env.AJAH_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 35000,
          }
        );
        if (res.data?.status === "success" || res.data?.token) {
          return {
            provider: "AJAH",
            token: res.data.token || res.data.meter_token,
            units: res.data.units || "",
            raw: res.data,
          };
        }
        throw new Error(res.data?.message || "Ajah billpayment failed");
      }

      // F. VTPASS
      if (provider === "VTPASS") {
        const serviceIdMap = {
          ikedc: "ikeja-electric",
          ekedc: "eko-electric",
          aedc: "abuja-electric",
          kedco: "kano-electric",
          ibedc: "ibadan-electric",
          phed: "portharcourt-electric",
          eedc: "enugu-electric",
          yedc: "yola-electric",
        };
        const res = await axios.post(
          "https://api-service.vtpass.com/api/pay",
          {
            request_id: reference,
            serviceID: serviceIdMap[normDisco] || `${normDisco}-electric`,
            billersCode: meterNo,
            variation_code: meterType.toLowerCase(),
            amount: Number(amount),
            phone: cleanPhone,
          },
          {
            headers: {
              "api-key": process.env.VTPASS_API_KEY,
              "secret-key": process.env.VTPASS_SECRET_KEY,
            },
            timeout: 35000,
          }
        );
        if (res.data?.code === "000") {
          return {
            provider: "VTPASS",
            token: res.data.token || res.data.purchased_code,
            units: res.data.units || "",
            raw: res.data,
          };
        }
        throw new Error(res.data?.response_description || "VTPass failed");
      }
    } catch (err) {
      console.warn(`⚠️ [POWER FAIL]: ${provider} - ${err.message}. Cascading to next...`);
      errors.push(`${provider}: ${err.message}`);
    }
  }

  throw new Error(`All power gateways failed. Details: ${errors.join(" | ")}`);
};

// 3. DISPATCHER DON CABLE TV
exports.routeCable = async ({ cableTv, packageCode, smartCardNo, phone, reference }) => {
  const balances = await getProviderBalances();
  const errors = [];
  const normCable = cableTv.toLowerCase().trim();
  const cleanPhone = phone || "08011111111";

  const hasAlIhsan = Boolean(
    process.env.ALIHSAN_AUTH_TOKEN ||
    process.env.ALIHSAN_API_KEY ||
    "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x"
  );

  const allProviders = [
    { name: "ALIHSAN", balance: balances.ALIHSAN, hasEnv: hasAlIhsan },
    { name: "SMARTSMS", balance: balances.SMARTSMS, hasEnv: Boolean(process.env.SMARTSMS_API_TOKEN) },
    { name: "CLUBCONNECT", balance: balances.CLUBCONNECT, hasEnv: Boolean(process.env.CLUBCONNECT_API_KEY) },
    { name: "BILALSADA", balance: balances.BILALSADA, hasEnv: Boolean(process.env.BILALSADA_API_TOKEN) },
    { name: "GLOBECONNECT", balance: balances.GLOBECONNECT, hasEnv: Boolean(process.env.GLOBECONNECT_API_KEY) },
    { name: "AJAH", balance: balances.AJAH, hasEnv: Boolean(process.env.AJAH_API_KEY) },
    { name: "VTPASS", balance: balances.VTPASS, hasEnv: Boolean(process.env.VTPASS_API_KEY) },
  ];

  let candidates = allProviders
    .filter((p) => p.hasEnv && p.balance >= 1000)
    .map((p) => p.name);

  if (candidates.length === 0) {
    candidates = allProviders.filter((p) => p.hasEnv).map((p) => p.name);
  }

  for (const provider of candidates) {
    try {
      console.log(`📺 [CABLE DISPATCH]: Trying ${provider} for ${smartCardNo}...`);

      // 0. AL-IHSAN DATASUB
      if (provider === "ALIHSAN") {
        const alihsanToken =
          process.env.ALIHSAN_AUTH_TOKEN ||
          process.env.ALIHSAN_API_KEY ||
          "BvpQJPXh5zmSnmUtL096qWV6BXYbhltOud2H2YPGjJnxINhm6x";

        const baseUrl = process.env.ALIHSAN_BASE_URL || "https://alihsandatasub.com.ng/api/v1";

        const res = await axios.post(
          `${baseUrl}/cablesub.php`,
          {
            cablename: normCable.toUpperCase(),
            cableplan: packageCode,
            smart_card_number: smartCardNo,
            customer_phone: cleanPhone,
            reference: reference,
          },
          {
            headers: {
              Authorization: alihsanToken,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 35000,
          }
        );

        const st = String(res.data?.status || "").toLowerCase();
        if (st === "success" || st === "successful") {
          return { provider: "ALIHSAN", raw: res.data };
        }
        throw new Error(res.data?.message || res.data?.error || "Al-Ihsan Cable Failed");
      }

      // A. SMARTSMS
      if (provider === "SMARTSMS") {
        const res = await axios.post(
          "https://smartsmssolutions.com/api/json.php",
          {
            token: process.env.SMARTSMS_API_TOKEN,
            type: "cable_tv",
            provider: normCable,
            smartcard: smartCardNo,
            package: packageCode,
            ref: reference,
          },
          { timeout: 35000 }
        );
        if (res.data?.code === "1000" || res.data?.status === "success") {
          return { provider: "SMARTSMS", raw: res.data };
        }
        throw new Error(res.data?.message || "SmartSMS Cable Failed");
      }

      // B. CLUBCONNECT
      if (provider === "CLUBCONNECT") {
        const clubCableMap = { dstv: "01", gotv: "02", startimes: "03" };
        const cCode = clubCableMap[normCable] || "01";
        const url = `https://www.clubconnect.com.ng/api/cablesub?UserID=${process.env.CLUBCONNECT_USER_ID}&APIKey=${process.env.CLUBCONNECT_API_KEY}&CableTV=${cCode}&Package=${packageCode}&SmartCardNo=${smartCardNo}&PhoneNo=${cleanPhone}&RequestID=${reference}`;

        const res = await axios.get(url, { timeout: 35000 });
        const st = String(res.data?.status || res.data?.statuscode || "").toLowerCase();
        if (st.includes("success") || st === "100" || st === "200") {
          return { provider: "CLUBCONNECT", raw: res.data };
        }
        throw new Error(res.data?.msg || res.data?.status || "ClubConnect Cable Failed");
      }

      // C. BILALSADA
      if (provider === "BILALSADA") {
        const cableMap = { dstv: 1, gotv: 2, startimes: 3 };
        const res = await axios.post(
          "https://bilalsadasub.com/api/cablesub",
          {
            cable: cableMap[normCable] || 1,
            smart_card_number: smartCardNo,
            plan: Number(packageCode),
            "request-id": reference,
          },
          {
            headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
            timeout: 35000,
          }
        );
        if (res.data?.status === "success" || res.data?.status === "process") {
          return { provider: "BILALSADA", raw: res.data };
        }
        throw new Error(res.data?.message || "Bilalsadasub Cable Failed");
      }

      // D. GLOBECONNECT
      if (provider === "GLOBECONNECT") {
        const res = await axios.post(
          "https://api.globeconnect.ng/api/cable/pay",
          {
            cable: normCable,
            smartcard: smartCardNo,
            plan_id: packageCode,
            phone: cleanPhone,
            reference,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.GLOBECONNECT_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 35000,
          }
        );
        if (res.data?.status === "success" || res.data?.status === true) {
          return { provider: "GLOBECONNECT", raw: res.data };
        }
        throw new Error(res.data?.message || "GlobeConnect Cable Failed");
      }

      // E. AJAH API
      if (provider === "AJAH") {
        const res = await axios.post(
          "https://ajah.com.ng/api/cablesub",
          {
            cablename: normCable.toUpperCase(),
            smart_card_number: smartCardNo,
            cableplan: packageCode,
            ident: reference,
          },
          {
            headers: {
              Authorization: `Token ${process.env.AJAH_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 35000,
          }
        );
        if (res.data?.status === "success" || res.data?.status === "successful") {
          return { provider: "AJAH", raw: res.data };
        }
        throw new Error(res.data?.message || "Ajah Cable Failed");
      }

      // F. VTPASS
      if (provider === "VTPASS") {
        const res = await axios.post(
          "https://api-service.vtpass.com/api/pay",
          {
            request_id: reference,
            serviceID: normCable,
            billersCode: smartCardNo,
            variation_code: packageCode,
            phone: cleanPhone,
          },
          {
            headers: {
              "api-key": process.env.VTPASS_API_KEY,
              "secret-key": process.env.VTPASS_SECRET_KEY,
            },
            timeout: 35000,
          }
        );
        if (res.data?.code === "000") {
          return { provider: "VTPASS", raw: res.data };
        }
        throw new Error(res.data?.response_description || "VTPass Cable Failed");
      }
    } catch (err) {
      console.warn(`⚠️ [CABLE FAIL]: ${provider} - ${err.message}. Cascading to next...`);
      errors.push(`${provider}: ${err.message}`);
    }
  }

  throw new Error(`All cable providers failed: ${errors.join(" | ")}`);
};