// config/marketplacePlans.js

const NETWORKS = {
  "1": { name: "MTN", code: "MTN" },
  "2": { name: "AIRTEL", code: "AIRTEL" },
  "3": { name: "9MOBILE", code: "9MOBILE" },
  "4": { name: "GLO", code: "GLO" },
};

const DATA_PLANS = {
  // ==================== MTN DATA PLANS ====================
  "101": {
    networkId: "1",
    network: "MTN",
    name: "MTN 500MB SME",
    volume: "500MB",
    type: "SME",
    validity: "30 Days",
    apiPrice: 140,
    gatewayPlanId: "101", // Lambar da Al-Ihsan ko Gateway ke amfani da ita
  },
  "102": {
    networkId: "1",
    network: "MTN",
    name: "MTN 1GB SME",
    volume: "1GB",
    type: "SME",
    validity: "30 Days",
    apiPrice: 280,
    gatewayPlanId: "102",
  },
  "103": {
    networkId: "1",
    network: "MTN",
    name: "MTN 2GB SME",
    volume: "2GB",
    type: "SME",
    validity: "30 Days",
    apiPrice: 560,
    gatewayPlanId: "103",
  },
  "104": {
    networkId: "1",
    network: "MTN",
    name: "MTN 3GB SME",
    volume: "3GB",
    type: "SME",
    validity: "30 Days",
    apiPrice: 840,
    gatewayPlanId: "104",
  },
  "105": {
    networkId: "1",
    network: "MTN",
    name: "MTN 5GB SME",
    volume: "5GB",
    type: "SME",
    validity: "30 Days",
    apiPrice: 1400,
    gatewayPlanId: "105",
  },
  "106": {
    networkId: "1",
    network: "MTN",
    name: "MTN 10GB SME",
    volume: "10GB",
    type: "SME",
    validity: "30 Days",
    apiPrice: 2800,
    gatewayPlanId: "106",
  },

  // ==================== AIRTEL DATA PLANS ====================
  "201": {
    networkId: "2",
    network: "AIRTEL",
    name: "AIRTEL 500MB CG",
    volume: "500MB",
    type: "CG",
    validity: "30 Days",
    apiPrice: 150,
    gatewayPlanId: "201",
  },
  "202": {
    networkId: "2",
    network: "AIRTEL",
    name: "AIRTEL 1GB CG",
    volume: "1GB",
    type: "CG",
    validity: "30 Days",
    apiPrice: 290,
    gatewayPlanId: "202",
  },
  "203": {
    networkId: "2",
    network: "AIRTEL",
    name: "AIRTEL 2GB CG",
    volume: "2GB",
    type: "CG",
    validity: "30 Days",
    apiPrice: 580,
    gatewayPlanId: "203",
  },
  "205": {
    networkId: "2",
    network: "AIRTEL",
    name: "AIRTEL 5GB CG",
    volume: "5GB",
    type: "CG",
    validity: "30 Days",
    apiPrice: 1450,
    gatewayPlanId: "205",
  },

  // ==================== 9MOBILE DATA PLANS ====================
  "301": {
    networkId: "3",
    network: "9MOBILE",
    name: "9MOBILE 1GB SME",
    volume: "1GB",
    type: "SME",
    validity: "30 Days",
    apiPrice: 200,
    gatewayPlanId: "301",
  },
  "302": {
    networkId: "3",
    network: "9MOBILE",
    name: "9MOBILE 2GB SME",
    volume: "2GB",
    type: "SME",
    validity: "30 Days",
    apiPrice: 400,
    gatewayPlanId: "302",
  },

  // ==================== GLO DATA PLANS ====================
  "401": {
    networkId: "4",
    network: "GLO",
    name: "GLO 1GB CG",
    volume: "1GB",
    type: "CG",
    validity: "30 Days",
    apiPrice: 260,
    gatewayPlanId: "401",
  },
  "402": {
    networkId: "4",
    network: "GLO",
    name: "GLO 2GB CG",
    volume: "2GB",
    type: "CG",
    validity: "30 Days",
    apiPrice: 520,
    gatewayPlanId: "402",
  },
};

module.exports = {
  NETWORKS,
  DATA_PLANS,
};