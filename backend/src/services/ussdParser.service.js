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
/*
 * UNIVERSAL AIRTIME BALANCE PARSER
 *
 * Yana ƙoƙarin gane airtime balance daga:
 * - MTN
 * - Airtel
 * - Glo
 * - 9mobile
 * - Sauran provider messages
 *
 * Kada a taɓa DATA PARSER da ke ƙasa.
 */

function parseAirtimeBalance(message = "") {
  const text = normalize(message);

  if (!text) {
    return null;
  }

  /*
   * Hana data units da wasu kalmomin da
   * ba airtime balance ba ne su ruɗe parser.
   */
  const dataUnitPattern =
    /\b(?:TB|GB|GIGS?|G|MB|MEGS?|M|KB|K)\b/i;

  const percentagePattern =
    /%/;

  const phoneNumberPattern =
    /\b(?:\+?234|0)[789][01]\d{8}\b/;

  const datePattern =
    /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/;

  const timePattern =
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/;

  /*
   * Converts:
   * N1,250.50
   * ₦ 1250
   * NGN 1 250.50
   * 1250.50 Naira
   */
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

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return null;
    }

    return amount;
  };

  /*
   * Main/primary account patterns suna da
   * fifiko fiye da bonus ko promotional balance.
   */
  const priorityPatterns = [
    /*
     * Pulse main account: N200
     * Main account balance is NGN 200
     * Primary account = ₦200
     */
    /(?:pulse\s+)?(?:main|primary|principal|regular|normal)\s+(?:airtime\s+)?(?:account|balance|credit)\s*(?:balance)?\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,

    /*
     * Main Balance: N200
     * Primary Credit NGN 200
     */
    /(?:main|primary|principal|regular|normal)\s+(?:airtime\s+)?(?:balance|credit)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,

    /*
     * Your main account is N200
     */
    /(?:your\s+)?(?:main|primary|principal)\s+(?:airtime\s+)?account\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,
  ];

  /*
   * General balance formats.
   */
  const generalPatterns = [
    /*
     * Your airtime balance is N200
     * Airtime balance: ₦200
     */
    /(?:your\s+)?airtime\s+(?:account\s+)?(?:balance|credit)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,

    /*
     * Your account balance is N200
     * Account credit: NGN 200
     */
    /(?:your\s+)?account\s+(?:balance|credit)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,

    /*
     * Available balance: N200
     * Available credit is N200
     */
    /available\s+(?:airtime\s+)?(?:balance|credit|amount)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,

    /*
     * Current balance: N200
     * Remaining balance is N200
     */
    /(?:current|remaining|usable)\s+(?:airtime\s+)?(?:balance|credit|amount)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,

    /*
     * Your balance is N200
     * Balance: 200 Naira
     */
    /(?:your\s+)?balance\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)\s*(?:NGN|Naira)?/i,

    /*
     * Credit balance: N200
     * Credit: ₦200
     */
    /(?:credit\s+balance|airtime|credit)\s*(?:is|equals?|=|:|-)?\s*(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)/i,

    /*
     * You have N200 remaining
     * You have ₦200 airtime
     */
    /you\s+have\s+(?:₦|NGN|Naira|N)?\s*([\d\s,]+(?:\.\d+)?)\s*(?:NGN|Naira)?\s*(?:airtime|credit|remaining|left|available)/i,

    /*
     * N200 remaining
     * ₦200 available
     */
    /(?:₦|NGN|\bN)\s*([\d\s,]+(?:\.\d+)?)\s*(?:airtime|credit|remaining|left|available)/i,

    /*
     * 200 Naira balance
     */
    /([\d\s,]+(?:\.\d+)?)\s*(?:NGN|Naira)\s*(?:airtime\s+)?(?:balance|credit|remaining|available)/i,
  ];

  /*
   * Gwada priority patterns da farko.
   */
  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const amount = parseMoneyValue(
      match[1]
    );

    if (amount !== null) {
      return amount;
    }
  }

  /*
   * Sannan gwada general patterns.
   */
  for (const pattern of generalPatterns) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const matchedText =
      match[0] || "";

    /*
     * Kada ya ɗauki data, percentage,
     * date, time ko phone number.
     */
    if (
      dataUnitPattern.test(matchedText) ||
      percentagePattern.test(matchedText) ||
      phoneNumberPattern.test(matchedText) ||
      datePattern.test(matchedText) ||
      timePattern.test(matchedText)
    ) {
      continue;
    }

    const amount = parseMoneyValue(
      match[1]
    );

    if (amount !== null) {
      return amount;
    }
  }

  /*
   * Currency fallback:
   * ₦500
   * NGN 500
   * N500
   * 500 Naira
   *
   * Ana amfani da shi ne kawai idan message
   * yana ɗauke da balance/account/airtime/credit.
   */
  const hasAirtimeContext =
    /\b(?:balance|airtime|account|credit|remaining|available|main|primary)\b/i.test(
      text
    );

  if (hasAirtimeContext) {
    const currencyPatterns = [
      /(?:₦|NGN|\bN)\s*([\d\s,]+(?:\.\d+)?)/gi,
      /([\d\s,]+(?:\.\d+)?)\s*(?:NGN|Naira)\b/gi,
    ];

    for (const pattern of currencyPatterns) {
      const matches = [
        ...text.matchAll(pattern),
      ];

      for (const match of matches) {
        const matchedText =
          match[0] || "";

        if (
          dataUnitPattern.test(matchedText) ||
          percentagePattern.test(matchedText) ||
          phoneNumberPattern.test(matchedText) ||
          datePattern.test(matchedText) ||
          timePattern.test(matchedText)
        ) {
          continue;
        }

        const amount = parseMoneyValue(
          match[1]
        );

        if (amount !== null) {
          return amount;
        }
      }
    }
  }

  return null;
}

exports.parseAirtimeBalance =
  parseAirtimeBalance;

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