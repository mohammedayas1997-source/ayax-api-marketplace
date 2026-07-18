const normalize = (message = "") =>
  String(message)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

exports.parseAirtimeBalance = (message = "") => {
  const text = normalize(message);

  const patterns = [
    /(?:₦|NGN|N)\s*([0-9]+(?:\.[0-9]+)?)/i,
    /balance(?:\sis|\s*:)?\s*(?:₦|NGN|N)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    /main balance(?:\sis|\s*:)?\s*(?:₦|NGN|N)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    /account balance(?:\sis|\s*:)?\s*(?:₦|NGN|N)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    /remaining(?:\sbalance)?(?:\sis|\s*:)?\s*(?:₦|NGN|N)?\s*([0-9]+(?:\.[0-9]+)?)/i,
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

  const patterns = [
    /([0-9]+(?:\.[0-9]+)?)\s*(GB|MB|KB)/i,
    /balance(?:\sis|\s*:)?\s*([0-9]+(?:\.[0-9]+)?)\s*(GB|MB|KB)/i,
    /remaining(?:\sis|\s*:)?\s*([0-9]+(?:\.[0-9]+)?)\s*(GB|MB|KB)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return `${match[1]} ${match[2].toUpperCase()}`;
    }
  }

  return null;
};

exports.parseExpiryDate = (message = "") => {
  const text = normalize(message);

  const patterns = [
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
    /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/,
    /valid till\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4}/i,
    /expires?\s+on\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4}/i,
    /expiry\s*:?\s*[A-Za-z]+\s+\d{1,2},?\s+\d{4}/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return null;
};