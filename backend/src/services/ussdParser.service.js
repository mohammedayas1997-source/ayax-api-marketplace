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
  const text = normalize(message);

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

  const priorityPatterns = [
    /(?:pulse\s+)?(?:main|primary|principal|regular|normal)\s+(?:airtime\s+)?(?:account|balance|credit)\s*(?:balance)?\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:main|primary|principal|regular|normal)\s+(?:airtime\s+)?(?:balance|credit)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:your\s+)?(?:main|primary|principal)\s+(?:airtime\s+)?account\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
  ];

  const generalPatterns = [
    /(?:your\s+)?airtime\s+(?:account\s+)?(?:balance|credit)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:your\s+)?account\s+(?:balance|credit)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /available\s+(?:airtime\s+)?(?:balance|credit|amount)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:current|remaining|usable)\s+(?:airtime\s+)?(?:balance|credit|amount)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /(?:your\s+)?balance\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)\s*(?:NGN|Naira)?/i,
    /(?:credit\s+balance|airtime|credit)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /you\s+have\s+(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)\s*(?:NGN|Naira)?\s*(?:airtime|credit|remaining|left|available)/i,
    /(?:₦|NGN|\bN)\s*([\d\s,]+(?:\.\d+)?)\s*(?:airtime|credit|remaining|left|available)/i,
    /([\d\s,]+(?:\.\d+)?)\s*(?:NGN|Naira)\s*(?:airtime\s+)?(?:balance|credit|remaining|available)/i,
    // Sabbin da aka kara domin kama sauran sakonni masu sauki:
    /(?:balance\s*(?:is)?)\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
    /bal\s*(?:is|[:=-])?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const amount = parseMoneyValue(match[1]);

    if (amount !== null) {
      return amount;
    }
  }

  for (const pattern of generalPatterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

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
      return amount;
    }
  }

  const hasAirtimeContext =
    /\b(?:balance|airtime|account|credit|remaining|available|main|primary|bal)\b/i.test(
      text
    );

  if (hasAirtimeContext) {
    const currencyPatterns = [
      /(?:₦|NGN|\bN)\s*([\d\s,]+(?:\.\d+)?)/gi,
      /([\d\s,]+(?:\.\d+)?)\s*(?:NGN|Naira)\b/gi,
    ];

    for (const pattern of currencyPatterns) {
      const matches = [...text.matchAll(pattern)];

      for (const match of matches) {
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
          return amount;
        }
      }
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

  const matches = [
    ...text.matchAll(
      /([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/gi
    ),
  ];

  if (matches.length === 0) {
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
  const sep = "[\\s\\/\\-]+";

  const patterns = [
    new RegExp(
      `(?:valid\\s+(?:until|till)|expires?\\s+(?:on)?|expiry(?:\\s+date)?)\\s*(?:is|:|-)?\\s*` +
        `(\\d{1,2}${sep}\\d{1,2}${sep}\\d{2,4}|\\d{4}${sep}\\d{1,2}${sep}\\d{1,2})`,
      "i"
    ),
    new RegExp(
      `(?:valid\\s+(?:until|till)|expires?\\s+(?:on)?|expiry(?:\\s+date)?)\\s*(?:is|:|-)?\\s*` +
        `(\\d{1,2}${sep}[A-Za-z]{3,9}${sep}\\d{2,4})`,
      "i"
    ),
    new RegExp(
      `(?:valid\\s+(?:until|till)|expires?\\s+(?:on)?|expiry(?:\\s+date)?)\\s*(?:is|:|-)?\\s*` +
        `([A-Za-z]{3,9}${sep}\\d{1,2}${sep}\\d{2,4})`,
      "i"
    ),
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
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