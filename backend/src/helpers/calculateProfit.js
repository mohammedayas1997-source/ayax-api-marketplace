module.exports = function calculateProfit({
  costPrice = 0,
  sellingPrice = 0,
  quantity = 1,
}) {
  const cost = Number(costPrice) * Number(quantity);
  const selling = Number(sellingPrice) * Number(quantity);
  const profit = selling - cost;

  const margin =
    selling > 0 ? Number(((profit / selling) * 100).toFixed(2)) : 0;

  return {
    cost,
    selling,
    profit,
    margin,
  };
};