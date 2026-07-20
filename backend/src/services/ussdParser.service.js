const normalize = (message = "") =>
  String(message)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeUnit = (unit = "") => {
  const value = String(unit).toUpperCase();

  if (value === "G" || value === "GIG" || value === "GIGS") {
    return "GB";
  }

  if (value === "M" || value === "MEG" || value === "MEGS") {
    return "MB";
  }

  if (value === "K") {
    return "KB";
  }

  return value;
};

exports.parseAirtimeBalance = (message = "") => {
  const text = normalize(message);

  const patterns = [
    /(?:main|airtime|account|available)?\s*balance(?:\s+is|\s*:)?\s*(?:₦|NGN|N)\s*([0-9]+(?:\.[0-9]+)?)/i,
    /(?:₦|NGN|N)\s*([0-9]+(?:\.[0-9]+)?)/i,
    /remaining(?:\s+balance)?(?:\s+is|\s*:)?\s*(?:₦|NGN|N)?\s*([0-9]+(?:\.[0-9]+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
};

exports.parseDataBalance = (message = "") => {
  const text = normalize(message);

  const labelledPatterns = [
    /(?:data|bundle|internet|main data|total data|available data|remaining data)\s*(?:balance)?(?:\s+is|\s*:|\s*=)?\s*([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i,
    /(?:you have|remaining|available|balance is|balance:)\s*([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\s*(?:remaining|left|available)/i,
  ];

  for (const pattern of labelledPatterns) {
    const match = text.match(pattern);

    if (match) {
      return `${match[1]} ${normalizeUnit(match[2])}`;
    }
  }

  /*
   * Wasu networks suna dawo da bundles da yawa:
   * "Main Data: 1.5GB, Bonus: 500MB"
   * A nan muna tattara dukkan balances domin dashboard ya nuna su.
   */
  const allMatches = [
    ...text.matchAll(
      /([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/gi
    ),
  ];

  if (allMatches.length === 0) {
    return null;
  }

  const uniqueBalances = [];
  const seen = new Set();

  for (const match of allMatches) {
    const value = `${match[1]} ${normalizeUnit(match[2])}`;

    if (!seen.has(value)) {
      seen.add(value);
      uniqueBalances.push(value);
    }
  }

  return uniqueBalances.join(" + ");
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