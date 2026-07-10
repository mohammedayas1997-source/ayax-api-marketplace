exports.parseAirtimeBalance = (message = "") => {
  const text = String(message).replace(/,/g, "");

  const nairaMatch =
    text.match(/(?:₦|N|NGN)\s?(\d+(\.\d+)?)/i) ||
    text.match(/balance.*?(\d+(\.\d+)?)/i);

  if (!nairaMatch) return null;

  return Number(nairaMatch[1]);
};

exports.parseDataBalance = (message = "") => {
  const text = String(message);

  const dataMatch = text.match(/(\d+(\.\d+)?)\s?(GB|MB|KB)/i);

  if (!dataMatch) return null;

  return `${dataMatch[1]}${dataMatch[3].toUpperCase()}`;
};

exports.parseExpiryDate = (message = "") => {
  const text = String(message);

  const dateMatch =
    text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/) ||
    text.match(/valid till\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

  if (!dateMatch) return null;

  return dateMatch[0];
};