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
 * UNIVERSAL AIRTIME BALANCE PARSER (AN GYARA ANAN KAWAI)
 */
function parseAirtimeBalance(message = "") {
  console.log("RAW USSD MESSAGE:", message);
  const text = normalize(message);
  console.log("NORMALIZED TEXT:", text);

  if (!text) {
    return null;
  }

  const dataUnitPattern =
    /\b(?:TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i;

  const percentagePattern = /%/;

  const phoneNumberPattern =
    /\b(?:\+?234|0)[789][01]\d{8}\b/;

  const datePattern =
    /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/;

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

  // 1. Gwada kamo lambar kuɗi kai tsaye daga gaban kowace kalma ta asusu ko alamar kuɗi
  const exactPatterns = [
    /(?:main\s*account|account|balance|bal|credit|main|pulse)[:\s]*(?:₦|NGN|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:₦|NGN|\bN)\s*([\d\s,]+(?:\.\d+)?)/i,
    /is[:\s]*(?:₦|NGN|N)?\s*([\d\s,]+(?:\.\d+)?)/i
  ];

  for (const pattern of exactPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseMoneyValue(match[1]);
      if (amount !== null) {
        console.log("MATCHED AIRTIME AMOUNT:", amount);
        return amount;
      }
    }
  }

  // 2. Duba ko akwai kowace lamba da ta dace da tsarin kuɗi a cikin saƙon
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
      console.log("MATCHED AIRTIME AMOUNT (GENERAL):", amount);
      return amount;
    }
  }

  return null;
}

exports.parseAirtimeBalance = parseAirtimeBalance;

/*
 * DATA PARSER (BA A TABA SHI BA)
 */
exports.parseDataBalance = (message = "") => {
  const text = normalize(message);

  if (/don't have any active data bundle|no active data|expired/i.test(text)) {
    return "0MB";
  }

  if (/data\s*balances?/i.test(text)) {
    const dataMatches = [...text.matchAll(/([A-Za-z0-9\-_]+)[:\s]*(?:₦|NGN|N)?\s*([0-9]+(?:\.[0-9]+)?\s*(?:TB|GB|MB|KB)?)/gi)];
    const unitCheck = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i);
    if (!unitCheck) {
      const matchZero = text.match(/:\s*(?:N|₦)?0(?:\.00)?/);
      if (matchZero && /InstaTop|Social|Video/i.test(text)) {
      }
    }
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
 * EXPIRY DATE PARSER (BA A TABA SHI BA)
 */
exports.parseExpiryDate = (message = "") => {
  const text = normalize(message);
  const sep = "[\\s\\/\\-\\.]+";

  const patterns = [
    new RegExp(
      `(?:valid\\s+(?:until|till|to)|expires?\\s+(?:on)?|expiry(?:\\s+date)?|validity)\\s*(?:is|:|-)?\\s*` +
        `(\\d{1,2}${sep}(?:\\d{1,2}|[A-Za-z]{3,9})${sep}\\d{2,4})`,
      "i"
    ),
    new RegExp(
      `(?:on|till|until|date)\\s*[:\\-]?\\s*` +
        `(\\d{1,2}${sep}(?:\\d{1,2}|[A-Za-z]{3,9})${sep}\\d{2,4})`,
      "i"
    ),
    new RegExp(`\\b(\\d{1,2}${sep}[A-Za-z]{3,9}${sep}\\d{2,4})`, "i"),
    new RegExp(`\\b(\\d{4}${sep}\\d{1,2}${sep}\\d{1,2})`, "i"),
    new RegExp(`\\b(\\d{1,2}${sep}\\d{1,2}${sep}\\d{2,4})`, "i"),
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/,
    /\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/,
    /\b\d{1,2}[\s\-]+[A-Za-z]{3,9}[\s\-]+\d{2,4}\b/,
    /\b[A-Za-z]{3,9}[\s\-]+\d{1,2}[\s\-,]+\d{2,4}\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return (match[1] || match[0]).trim();
    }
  }

  return null;
};