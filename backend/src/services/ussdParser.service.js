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

  if (["T", "TERA"].includes(value)) {
    return "TB";
  }

  if (value === "K") {
    return "KB";
  }

  return value;
};

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

/*
 * MOMO WALLET & AIRTIME BALANCE PARSER (USSD / SMS)
 */
function parseAirtimeBalance(message = "") {
  const text = normalize(message);
  if (!text) return null;

  const dataUnitPattern = /\b(?:TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i;
  const percentagePattern = /%/;
  const phoneNumberPattern = /\b(?:\+?234|0)[789][01]\d{8}\b/;
  const datePattern = /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/;
  const timePattern = /\b\d{1,2}:\d{2}(?::\d{2})?\b/;

  const exactPatterns = [
    /(?:momo\s*balance|momo\s*wallet|wallet\s*balance|available\s*balance|main\s*account|account\s*bal|account|balance|bal|credit|main|pulse)[:\s]*(?:is\s*)?(?:₦|NGN|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:₦|NGN|\bN)\s*([\d\s,]+(?:\.\d+)?)/i,
    /is[:\s]*(?:₦|NGN|N)?\s*([\d\s,]+(?:\.\d+)?)/i
  ];

  for (const pattern of exactPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseMoneyValue(match[1]);
      if (amount !== null) return amount;
    }
  }

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
    if (amount !== null) return amount;
  }

  return null;
}

/*
 * SME DATA & BUNDLE BALANCE PARSER
 */
function parseDataBalance(message = "") {
  const text = normalize(message);
  if (!text) return null;

  if (/don't have any active data bundle|no active data|expired/i.test(text)) {
    return "0MB";
  }

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
    if (/data\s*balance/i.test(text)) return "0MB";
    return null;
  }

  const balances = [];
  const seen = new Set();

  for (const match of matches) {
    const amount = Number(match[1]);
    const unit = normalizeUnit(match[2]);

    if (!Number.isFinite(amount)) continue;

    const key = `${amount}-${unit}`;
    if (!seen.has(key)) {
      seen.add(key);
      balances.push(`${amount} ${unit}`);
    }
  }

  return balances.length > 0 ? balances.join(" + ") : null;
}

/*
 * EXPIRY DATE PARSER
 */
function parseExpiryDate(message = "") {
  if (!message) return null;
  const text = normalize(message);

  const daysMatch = text.match(/(?:valid\s+for|validity[:\s]+)(\d+)\s*days?/i);
  if (daysMatch && daysMatch[1]) {
    const days = parseInt(daysMatch[1], 10);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    return targetDate.toISOString();
  }

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
}

/*
 * UNIVERSAL PHONE NUMBER PARSER
 */
function parsePhoneNumber(message = "") {
  if (!message) return null;
  const text = String(message)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/,/g, "")
    .trim();

  const labelMatch = text.match(/(?:msisdn|mdn|number|mobile|phone|no)[:\s]*(?:is\s*)?(?:\+?234|0)?([789][01]\d{8})/i);
  if (labelMatch && labelMatch[1]) {
    return `0${labelMatch[1]}`;
  }

  const intlMatch = text.match(/(?:\+?234)([789][01]\d{8})/);
  if (intlMatch && intlMatch[1]) {
    return `0${intlMatch[1]}`;
  }

  const localMatch = text.match(/\b(0[789][01]\d{8})\b/);
  if (localMatch && localMatch[1]) {
    return localMatch[1];
  }

  return null;
}

/*
 * BUILD SMS COMMANDS (MTN & AIRTEL AIRTIME / DATA)
 * Yana haɗa command ɗin da wayar GSM Gateway za ta tura ta SMS
 */
function buildSmsCommand({ network, type, recipient, amountOrPlan, pin }) {
  const cleanPhone = parsePhoneNumber(recipient) || recipient;
  const net = String(network).toUpperCase().trim();
  const sType = String(type).toUpperCase().trim();

  if (net === "MTN") {
    if (sType === "AIRTIME") {
      return {
        recipient: "321", // MTN Share (Me2U) shortcode
        message: `Transfer ${cleanPhone} ${amountOrPlan} ${pin}`
      };
    }

    if (sType === "DATA") {
      // SME Data Share (SME / Corporate Gifting)
      return {
        recipient: "312",
        message: `SME ${cleanPhone} ${amountOrPlan} ${pin}`
      };
    }
  }

  if (net === "AIRTEL") {
    if (sType === "AIRTIME") {
      return {
        recipient: "432", // Airtel Me2U shortcode
        message: `2U ${cleanPhone} ${amountOrPlan} ${pin}`
      };
    }

    if (sType === "DATA") {
      // Airtel Data Gifting / Share
      return {
        recipient: "141",
        message: `SHARE ${cleanPhone} ${amountOrPlan} ${pin}`
      };
    }
  }

  throw new Error(`Unsupported network [${network}] or service type [${type}] for SMS execution`);
}

/*
 * PARSE TELCO SMS FEEDBACK (SUCCESS / FAIL DETECTION)
 * Yana gane ko saƙon da telco ta dawo da shi nasara ne ko akwai matsala
 */
function parseTransactionFeedback(message = "") {
  const text = normalize(message);
  if (!text) return { status: "UNKNOWN", raw: message };

  // Nasara (Success)
  const isSuccess = /(?:successful|transferred|recharge\s*of|shared\s*with|credited|completed|sent\s*to)/i.test(text) &&
                    !/(?:not\s*successful|unsuccessful|failed|insufficient)/i.test(text);

  if (isSuccess) {
    return {
      status: "SUCCESS",
      message: text,
      reference: text.match(/(?:ref|txn|id)[:\s]*([a-zA-Z0-9_-]+)/i)?.[1] || null
    };
  }

  // Rashin isassun kuɗi / data (Insufficient Balance)
  if (/(?:insufficient|low\s*balance|not\s*enough)/i.test(text)) {
    return { status: "INSUFFICIENT_BALANCE", message: text };
  }

  // Kuskuren PIN
  if (/(?:incorrect\s*pin|invalid\s*pin|wrong\s*pin)/i.test(text)) {
    return { status: "INVALID_PIN", message: text };
  }

  // Cunkoso ko gazawa (Failed)
  if (/(?:failed|error|unable|blocked|barred|try\s*again)/i.test(text)) {
    return { status: "FAILED", message: text };
  }

  return { status: "PENDING", message: text };
}

module.exports = {
  parseAirtimeBalance,
  parseDataBalance,
  parseExpiryDate,
  parsePhoneNumber,
  buildSmsCommand,
  parseTransactionFeedback
};