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
 * AIRTIME PARSER
 * An bar salon da yake aiki a baya.
 */
function parseAirtimeBalance(text = "") {
  if (!text) return null;

  const patterns = [
    /Pulse\s+main\s+account:\s*[₦N]?\s*([\d,]+(?:\.\d+)?)/i,
    /Main\s+Balance[:\s]*[₦N]?\s*([\d,]+(?:\.\d+)?)/i,
    /Your\s+balance\s+is\s*[₦N]?\s*([\d,]+(?:\.\d+)?)/i,
    /Account\s+Balance[:\s]*[₦N]?\s*([\d,]+(?:\.\d+)?)/i,
    /Balance[:\s]*[₦N]?\s*([\d,]+(?:\.\d+)?)/i,
    /[₦N]\s*([\d,]+(?:\.\d+)?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ""));
    }
  }

  return null;
};

/*
 * DATA PARSER
 * Yana karɓar balance guda ɗaya ko bundles masu yawa.
 *
 * Misali:
 * Binge Bundle: 943.57MB
 * YouTube Night: 4090.77MB
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

  const patterns = [
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,

    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,

    /(?:valid\s+(?:until|till)|expires?\s+(?:on)?|expiry(?:\s+date)?\s*:?)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,

    /(?:valid\s+(?:until|till)|expires?\s+(?:on)?|expiry(?:\s+date)?\s*:?)\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return match[1] || match[0];
    }
  }

  return null;
};