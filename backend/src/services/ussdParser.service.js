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
 * UNIVERSAL AIRTIME BALANCE PARSER
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

  // 1. Gwada kamo duk wata lamba da ke zuwa bayan alamar kudi ko kalmar account/balance kai tsaye
  const exactPatterns = [
    /(?:main\s*account|account|balance|bal|credit|main|pulse)[:\s]*(?:₦|NGN|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:₦|NGN|\bN)\s*([\d\s,]+(?:\.\d+)?)/i,
    /is[:\s]*(?:₦|NGN|N)?\s*([\d\s,]+(?:\.\d+)?)/i
  ];

  for (const pattern of exactPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseMoneyValue(match[1]);
      console.log("MATCHED AIRTIME AMOUNT:", amount);
      if (amount !== null) {
        return amount;
      }
    }
  }

  // 2. Duba ko akwai duk wata lamba da ta dace da tsarin kudi a cikin sakon idan har akwai alamar cewa na airtime ne
  const allMatches = [...text.matchAll(/(?:₦|NGN|\bN)?\s*([0-9]+(?:\.[0-9]{2})?)/gi)];
  for (const match of allMatches) {
    const matchedText = match[0] || "";
    
    // Tabbatar cewa ba data bane ko lamba mai alaka da date/phone
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
      return amount;
    }
  }

  return null;
}

exports.parseAirtimeBalance = parseAirtimeBalance;

/*
 * DATA PARSER
 */
exports.parseDataBalance = (message = "") => {
  const text = normalize(message);

  // Idan sakon yana nuna rashin data ko babu ita a jiki
  if (/don't have any active data bundle|no active data|expired/i.test(text)) {
    return "0MB";
  }

  // Idan sakon yana dauke da tsarin "Your data balances: InstaTop: N0. ..." ko makamancin haka
  if (/data\s*balances?/i.test(text)) {
    const dataMatches = [...text.matchAll(/([A-Za-z0-9\-_]+)[:\s]*(?:₦|NGN|N)?\s*([0-9]+(?:\.[0-9]+)?\s*(?:TB|GB|MB|KB)?)/gi)];
    // Idan akwai takamaiman adadin data a ciki
    const unitCheck = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i);
    if (!unitCheck) {
      // Idan babu sassan data na zahiri amma akwai sakon data balance
      const matchZero = text.match(/:\s*(?:N|₦)?0(?:\.00)?/);
      if (matchZero && /InstaTop|Social|Video/i.test(text)) {
        // Zai iya dawo da 0MB ko ci gaba da neman sauran
      }
    }
  }

  const matches = [
    ...text.matchAll(
      /([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/gi
    ),
  ];

  if (matches.length === 0) {
    // Tabbatar da cewa idan akwai tsarin data da ba a samu da unit ba amma yana nuna bayani
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

exports.parseExpiryDate = (message = "") => {
  const text = normalize(message);
  const sep = "[\\s\\/\\-\\.]+";

  const patterns = [
    // 1. Kalmomi masu nuna expiry tare da kwanan wata (misali: expires on 12/08/2026 ko valid till 12-Aug-26)
    new RegExp(
      `(?:valid\\s+(?:until|till|to)|expires?\\s+(?:on)?|expiry(?:\\s+date)?|validity)\\s*(?:is|:|-)?\\s*` +
        `(\\d{1,2}${sep}(?:\\d{1,2}|[A-Za-z]{3,9})${sep}\\d{2,4})`,
      "i"
    ),
    // 2. Kwanan wata da ke zuwa bayan kalmomi irin su "till", "on", ko "date"
    new RegExp(
      `(?:on|till|until|date)\\s*[:\\-]?\\s*` +
        `(\\d{1,2}${sep}(?:\\d{1,2}|[A-Za-z]{3,9})${sep}\\d{2,4})`,
      "i"
    ),
    // 3. Tsarin lamba kawai ko wata da harafi (misali: 12/08/2026 ko 12-Aug-2026)
    new RegExp(`\\b(\\d{1,2}${sep}[A-Za-z]{3,9}${sep}\\d{2,4})`, "i"),
    new RegExp(`\\b(\\d{4}${sep}\\d{1,2}${sep}\\d{1,2})`, "i"),
    new RegExp(`\\b(\\d{1,2}${sep}\\d{1,2}${sep}\\d{2,4})`, "i"),
    // 4. Duk wani tsari na kwanan wata da aka samu a cikin sakon ko da babu dogon bayani a gaba
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