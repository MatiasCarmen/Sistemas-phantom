export const formatAmount = (value: number, fractionDigits = 2): string => {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};
