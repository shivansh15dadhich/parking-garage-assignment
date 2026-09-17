function calculateFee(durationMinutes, rates) {
  if (durationMinutes < 0) {
    throw new Error('Duration cannot be negative');
  }

  const totalHours = Math.max(1, Math.ceil(durationMinutes / 60));

  let fee = rates.firstHourRate;
  if (totalHours > 1) {
    fee += (totalHours - 1) * rates.additionalHourRate;
  }

  return Math.min(fee, rates.dailyMax);
}

function calculateDurationMinutes(checkInTime, checkOutTime) {
  const start = new Date(checkInTime).getTime();
  const end = new Date(checkOutTime).getTime();
  const diffMs = end - start;
  return Math.max(0, Math.round(diffMs / 60000));
}

module.exports = { calculateFee, calculateDurationMinutes };
