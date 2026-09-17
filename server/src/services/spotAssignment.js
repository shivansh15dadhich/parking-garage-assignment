const { spotCompatibility } = require('../config');

function assignSpot(vehicleType, availableSpots) {
  const compatibleTypes = spotCompatibility[vehicleType];
  if (!compatibleTypes) {
    throw new Error(`Unknown vehicle type: ${vehicleType}`);
  }

  const candidates = availableSpots
    .filter((spot) => compatibleTypes.includes(spot.spot_type))
    .sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.spot_number.localeCompare(b.spot_number);
    });

  return candidates[0] || null;
}

module.exports = { assignSpot };
