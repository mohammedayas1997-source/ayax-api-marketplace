const axios = require("axios");

// 1. DUBA WALLET BALANCE NA KOWANE PROVIDER
const getProviderBalances = async () => {
  const balances = {
    BILALSADA: 0,
    VTPASS: 0,
    SMARTSMS: 0,
    CLUBKONNECT: 0,
  };

  // Bilalsadasub
  if (process.env.BILALSADA_API_TOKEN) {
    try {
      const res = await axios.get("https://bilalsadasub.com/api/user", {
        headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
        timeout: 5000,
      });
      balances.BILALSADA = Number(res.data?.user?.wallet_balance || res.data?.wallet || 0);
    } catch (e) {
      balances.BILALSADA = 0;
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
        timeout: 5000,
      });
      balances.VTPASS = Number(res.data?.contents?.balance || 0);
    } catch (e) {
      balances.VTPASS = 0;
    }
  }

  // SmartSMS
  if (process.env.SMARTSMS_API_TOKEN) {
    try {
      const res = await axios.get(
        `https://smartsmssolutions.com/api/json.php?token=${process.env.SMARTSMS_API_TOKEN}&type=balance`,
        { timeout: 5000 }
      );
      balances.SMARTSMS = Number(res.data?.balance || 0);
    } catch (e) {
      balances.SMARTSMS = 0;
    }
  }

  return balances;
};

// 2. DISPATCHER DON ELECTRICITY
exports.routeElectricity = async ({ disco, meterNo, meterType, amount, phone, reference }) => {
  const balances = await getProviderBalances();
  const errors = [];

  // Jerin yadda tsarin zai gwada su: wanda yake da kudi kuma ya fi amount din
  const candidates = [
    { name: "BILALSADA", balance: balances.BILALSADA },
    { name: "VTPASS", balance: balances.VTPASS },
    { name: "SMARTSMS", balance: balances.SMARTSMS },
    { name: "CLUBKONNECT", balance: 999999 }, // default fallback
  ]
    .filter((p) => p.balance >= amount)
    .map((p) => p.name);

  if (candidates.length === 0) candidates.push("BILALSADA", "VTPASS", "CLUBKONNECT");

  for (const provider of candidates) {
    try {
      console.log(`⚡ [POWER DISPATCH]: Trying ${provider} for Meter ${meterNo}...`);

      if (provider === "BILALSADA") {
        const discoMap = { ikedc: 1, ekedc: 2, aedc: 3, kedco: 4, ibedc: 5, phed: 6, eedc: 7, yedc: 8 };
        const res = await axios.post(
          "https://bilalsadasub.com/api/billpayment",
          {
            disco: discoMap[disco.toLowerCase()] || 1,
            meter_number: meterNo,
            meter_type: meterType.toLowerCase(),
            amount: Number(amount),
            "request-id": reference,
          },
          {
            headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
            timeout: 30000,
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
            serviceID: serviceIdMap[disco.toLowerCase()] || `${disco.toLowerCase()}-electric`,
            billersCode: meterNo,
            variation_code: meterType.toLowerCase(),
            amount: Number(amount),
            phone: phone || "08011111111",
          },
          {
            headers: {
              "api-key": process.env.VTPASS_API_KEY,
              "secret-key": process.env.VTPASS_SECRET_KEY,
            },
            timeout: 30000,
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

      if (provider === "SMARTSMS") {
        const res = await axios.post(
          "https://smartsmssolutions.com/api/json.php",
          {
            token: process.env.SMARTSMS_API_TOKEN,
            type: "electricity",
            disco: disco.toLowerCase(),
            meter: meterNo,
            meter_type: meterType.toLowerCase(),
            amount: Number(amount),
            phone: phone,
            ref: reference,
          },
          { timeout: 30000 }
        );
        if (res.data?.code === "1000" || res.data?.status === "success") {
          return {
            provider: "SMARTSMS",
            token: res.data.token || res.data.meter_token,
            units: res.data.units || "",
            raw: res.data,
          };
        }
        throw new Error(res.data?.message || "SmartSMS failed");
      }
    } catch (err) {
      console.warn(`⚠️ [PROVIDER FAIL]: ${provider} - ${err.message}. Cascading to next...`);
      errors.push(`${provider}: ${err.message}`);
    }
  }

  throw new Error(`All power gateways failed. Details: ${errors.join(" | ")}`);
};

// 3. DISPATCHER DON CABLE TV
exports.routeCable = async ({ cableTv, packageCode, smartCardNo, phone, reference }) => {
  const balances = await getProviderBalances();
  const errors = [];

  const candidates = [
    { name: "BILALSADA", balance: balances.BILALSADA },
    { name: "VTPASS", balance: balances.VTPASS },
    { name: "SMARTSMS", balance: balances.SMARTSMS },
  ]
    .filter((p) => p.balance >= 1000)
    .map((p) => p.name);

  if (candidates.length === 0) candidates.push("BILALSADA", "VTPASS");

  for (const provider of candidates) {
    try {
      console.log(`📺 [CABLE DISPATCH]: Trying ${provider} for ${smartCardNo}...`);

      if (provider === "BILALSADA") {
        const cableMap = { dstv: 1, gotv: 2, startimes: 3 };
        const res = await axios.post(
          "https://bilalsadasub.com/api/cablesub",
          {
            cable: cableMap[cableTv.toLowerCase()] || 1,
            smart_card_number: smartCardNo,
            plan: Number(packageCode),
            "request-id": reference,
          },
          {
            headers: { Authorization: `Token ${process.env.BILALSADA_API_TOKEN}` },
            timeout: 30000,
          }
        );
        if (res.data?.status === "success" || res.data?.status === "process") {
          return { provider: "BILALSADA", raw: res.data };
        }
        throw new Error(res.data?.message || "Bilalsadasub Cable Failed");
      }

      if (provider === "VTPASS") {
        const res = await axios.post(
          "https://api-service.vtpass.com/api/pay",
          {
            request_id: reference,
            serviceID: cableTv.toLowerCase(),
            billersCode: smartCardNo,
            variation_code: packageCode,
            phone: phone || "08011111111",
          },
          {
            headers: {
              "api-key": process.env.VTPASS_API_KEY,
              "secret-key": process.env.VTPASS_SECRET_KEY,
            },
            timeout: 30000,
          }
        );
        if (res.data?.code === "000") {
          return { provider: "VTPASS", raw: res.data };
        }
        throw new Error(res.data?.response_description || "VTPass Cable Failed");
      }
    } catch (err) {
      console.warn(`⚠️ [PROVIDER FAIL]: ${provider} - ${err.message}. Cascading...`);
      errors.push(`${provider}: ${err.message}`);
    }
  }

  throw new Error(`All cable providers failed: ${errors.join(" | ")}`);
};