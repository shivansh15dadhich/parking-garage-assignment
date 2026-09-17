const DEFAULT_RATES = {
  COMPACT: { firstHourRate: 50, additionalHourRate: 30, dailyMax: 250 },
  STANDARD: { firstHourRate: 60, additionalHourRate: 35, dailyMax: 280 },
  EV: { firstHourRate: 80, additionalHourRate: 45, dailyMax: 350 }
};

export function estimateFee(checkInTime, vehicleType) {
  const rates = DEFAULT_RATES[vehicleType] || DEFAULT_RATES.STANDARD;
  const durationMinutes = Math.max(0, Math.round((Date.now() - new Date(checkInTime).getTime()) / 60000));
  const totalHours = Math.max(1, Math.ceil(durationMinutes / 60));
  let fee = rates.firstHourRate;
  if (totalHours > 1) fee += (totalHours - 1) * rates.additionalHourRate;
  return { fee: Math.min(fee, rates.dailyMax), durationMinutes };
}

export function formatDuration(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}
