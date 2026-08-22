const normalize = (message = "") =>
  String(message)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeUnit = (unit = "") => {
  const value = String(unit).toUpperCase();

  if (["G", "GIG", "GIGS"].includes(value)) {
    return "GB";
  }

  if (["M", "MEG", "MEGS"].includes(value)) {
    return "MB";
  }

  if (value === "K") {
    return "KB";
  }

  return value;
};

/*
 * MOMO WALLET & AIRTIME BALANCE PARSER
 */
function parseAirtimeBalance(message = "") {
  console.log("RAW BALANCE MESSAGE:", message);
  const text = normalize(message);
  console.log("NORMALIZED TEXT:", text);

  if (!text) {
    return null;
  }

  const dataUnitPattern = /\b(?:TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i;
  const percentagePattern = /%/;
  const phoneNumberPattern = /\b(?:\+?234|0)[789][01]\d{8}\b/;
  const datePattern = /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/;
  const timePattern = /\b\d{1,2}:\d{2}(?::\d{2})?\b/;

  const parseMoneyValue = (value) => {
    if (value === undefined || value === null) {
      return null;
    }

    const cleaned = String(value)
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .trim();

    if (!/^\d+(?:\.\d+)?$/.test(cleaned)) {
      return null;
    }

    const amount = Number(cleaned);

    if (!Number.isFinite(amount) || amount < 0) {
      return null;
    }

    return amount;
  };

  // 1. MoMo & Main Account specific regex patterns
  const exactPatterns = [
    /(?:momo\s*balance|momo\s*wallet|wallet\s*balance|available\s*balance|main\s*account|account\s*bal|account|balance|bal|credit|main|pulse)[:\s]*(?:is\s*)?(?:₦|NGN|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:₦|NGN|\bN)\s*([\d\s,]+(?:\.\d+)?)/i,
    /is[:\s]*(?:₦|NGN|N)?\s*([\d\s,]+(?:\.\d+)?)/i
  ];

  for (const pattern of exactPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseMoneyValue(match[1]);
      if (amount !== null) {
        console.log("MATCHED MOMO/AIRTIME AMOUNT:", amount);
        return amount;
      }
    }
  }

  // 2. General currency pattern fallback
  const allMatches = [...text.matchAll(/(?:₦|NGN|\bN)?\s*([0-9]+(?:\.[0-9]{2})?)/gi)];
  for (const match of allMatches) {
    const matchedText = match[0] || "";
    
    if (
      dataUnitPattern.test(matchedText) ||
      percentagePattern.test(matchedText) ||
      phoneNumberPattern.test(matchedText) ||
      datePattern.test(matchedText) ||
      timePattern.test(matchedText)
    ) {
      continue;
    }

    const amount = parseMoneyValue(match[1]);
    if (amount !== null) {
      console.log("MATCHED AMOUNT (GENERAL):", amount);
      return amount;
    }
  }

  return null;
}

exports.parseAirtimeBalance = parseAirtimeBalance;

/*
 * SME DATA & BUNDLE BALANCE PARSER
 */
exports.parseDataBalance = (message = "") => {
  const text = normalize(message);

  if (/don't have any active data bundle|no active data|expired/i.test(text)) {
    return "0MB";
  }

  // Handle SME Data SMS balance (e.g. "Your SME data balance is: 45000MB" or "45.5GB")
  const smeMatch = text.match(/(?:sme\s*(?:data)?\s*balance|data\s*balance|balance)[:\s]*(?:is\s*)?([0-9]+(?:\.[0-9]+)?)\s*(MB|GB|TB)/i);
  if (smeMatch) {
    const value = smeMatch[1];
    const unit = normalizeUnit(smeMatch[2]);
    return `${value}${unit}`;
  }

  const matches = [
    ...text.matchAll(
      /([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/gi
    ),
  ];

  if (matches.length === 0) {
    if (/data\s*balance/i.test(text)) {
      return "0MB";
    }
    return null;
  }

  const balances = [];
  const seen = new Set();

  for (const match of matches) {
    const amount = Number(match[1]);
    const unit = normalizeUnit(match[2]);

    if (!Number.isFinite(amount)) {
      continue;
    }

    const key = `${amount}-${unit}`;

    if (!seen.has(key)) {
      seen.add(key);
      balances.push(`${amount} ${unit}`);
    }
  }

  if (balances.length === 0) {
    return null;
  }

  return balances.join(" + ");
};

/*
 * ROBUST EXPIRY DATE PARSER (MTN, AIRTEL, GLO, 9MOBILE)
 */
exports.parseExpiryDate = (message = "") => {
  if (!message) return null;
  const text = normalize(message);

  // 1. Gano kwanaki (misali: "valid for 30 days" ko "validity: 30 days")
  const daysMatch = text.match(/(?:valid\s+for|validity[:\s]+)(\d+)\s*days?/i);
  if (daysMatch && daysMatch[1]) {
    const days = parseInt(daysMatch[1], 10);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    return targetDate.toISOString();
  }

  // 2. Gano Date tare da Kalmomin Telco (Expires on, Valid till, Exp Date)
  const patterns = [
    /(?:expires?|expiry|valid\s+till|valid\s+until|validity|exp\.?\s*date|exp)[:\s]+(?:on\s+)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i,
    /(?:expires?|expiry|valid\s+till|valid\s+until|validity|exp)[:\s]+(?:on\s+)?(\d{1,2}[\s\-]+[A-Za-z]{3,9}[\s\-]+\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i,
    /\b(\d{1,2}[\/\-\.][0-9]{1,2}[\/\-\.](?:20)?\d{2})\b/,
    /\b(\d{1,2}[\s\-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-]+(?:20)?\d{2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};
/*
 * UNIVERSAL PHONE NUMBER PARSER (MTN, AIRTEL, GLO, 9MOBILE)
 */
exports.parsePhoneNumber = (message = "") => {
  if (!message) return null;
  const text = String(message)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/,/g, "")
    .trim();

  // 1. Gano saƙonni masu dauke da kalmomi kamar "MSISDN", "Number", "MDN", "Phone"
  const labelMatch = text.match(/(?:msisdn|mdn|number|mobile|phone|no)[:\s]*(?:is\s*)?(?:\+?234|0)?([789][01]\d{8})/i);
  if (labelMatch && labelMatch[1]) {
    return `0${labelMatch[1]}`;
  }

  // 2. Gano lambar da ta fara da 234 (misali: 234803..., 234805..., 234802..., 234809...)
  const intlMatch = text.match(/(?:\+?234)([789][01]\d{8})/);
  if (intlMatch && intlMatch[1]) {
    return `0${intlMatch[1]}`;
  }

  // 3. Gano kowace lambar Najeriya mai lambobi 11 (080, 081, 090, 091, 070)
  const localMatch = text.match(/\b(0[789][01]\d{8})\b/);
  if (localMatch && localMatch[1]) {
    return localMatch[1];
  }

  return null;
};