const normalize = (message = "") =>
  String(message)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeUnit = (unit = "") => {
  const value = String(unit).toUpperCase();

  if (
    value === "G" ||
    value === "GIG" ||
    value === "GIGS"
  ) {
    return "GB";
  }

  if (
    value === "M" ||
    value === "MEG" ||
    value === "MEGS"
  ) {
    return "MB";
  }

  if (value === "K") {
    return "KB";
  }

  return value;
};

const convertToMb = (amount, unit) => {
  const value = Number(amount);
  const normalizedUnit = normalizeUnit(unit);

  if (!Number.isFinite(value)) {
    return 0;
  }

  if (normalizedUnit === "TB") {
    return value * 1024 * 1024;
  }

  if (normalizedUnit === "GB") {
    return value * 1024;
  }

  if (normalizedUnit === "KB") {
    return value / 1024;
  }

  return value;
};

const formatDataAmount = (amountMb) => {
  if (amountMb >= 1024) {
    return `${(amountMb / 1024).toFixed(2)} GB`;
  }

  return `${amountMb.toFixed(2)} MB`;
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

  /*
   * Fara da nemo bundles masu label.
   *
   * Misali:
   * Binge Bundle: 943.57MB
   * YouTube Night: 4090.77MB
   */
  const labelledBundlePattern =
    /([A-Za-z][A-Za-z0-9\s_-]{1,50}?)\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/gi;

  const labelledBundles = [];
  let match;

  while (
    (match = labelledBundlePattern.exec(text)) !== null
  ) {
    const label = match[1].trim();
    const amount = Number(match[2]);
    const unit = normalizeUnit(match[3]);

    if (!Number.isFinite(amount)) {
      continue;
    }

    labelledBundles.push({
      label,
      amount,
      unit,
      amountMb: convertToMb(amount, unit),
    });
  }

  if (labelledBundles.length > 0) {
    const totalMb = labelledBundles.reduce(
      (sum, bundle) => sum + bundle.amountMb,
      0
    );

    const breakdown = labelledBundles
      .map(
        (bundle) =>
          `${bundle.label}: ${bundle.amount} ${bundle.unit}`
      )
      .join(" | ");

    return `${formatDataAmount(totalMb)} (${breakdown})`;
  }

  /*
   * Idan network ta kawo balance guda ɗaya ba tare
   * da bundle labels masu yawa ba.
   */
  const singlePatterns = [
    /(?:data|bundle|internet|main data|total data|available data|remaining data)\s*(?:balance)?(?:\s+is|\s*:|\s*=)?\s*([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i,

    /(?:you have|remaining|available|balance is|balance:)\s*([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i,

    /([0-9]+(?:\.[0-9]+)?)\s*(TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\s*(?:remaining|left|available)/i,
  ];

  for (const pattern of singlePatterns) {
    const singleMatch = text.match(pattern);

    if (singleMatch) {
      return `${singleMatch[1]} ${normalizeUnit(
        singleMatch[2]
      )}`;
    }
  }

  /*
   * Fallback: tattara duk data amounts da ke cikin
   * sakon, sannan a haɗa su.
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
  let totalMb = 0;

  for (const item of allMatches) {
    const amount = Number(item[1]);
    const unit = normalizeUnit(item[2]);
    const key = `${amount}-${unit}`;

    if (!Number.isFinite(amount) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    totalMb += convertToMb(amount, unit);
    uniqueBalances.push(`${amount} ${unit}`);
  }

  if (uniqueBalances.length === 0) {
    return null;
  }

  if (uniqueBalances.length === 1) {
    return uniqueBalances[0];
  }

  return `${formatDataAmount(totalMb)} (${uniqueBalances.join(
    " + "
  )})`;
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