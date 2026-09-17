const db = require('../db');
const config = require('../config');

function getRatesForSpotType(spotType) {
  const row = db
    .prepare('SELECT first_hour_rate, additional_hour_rate, daily_max FROM rate_cards WHERE spot_type = ?')
    .get(spotType);

  if (row) {
    return {
      firstHourRate: row.first_hour_rate,
      additionalHourRate: row.additional_hour_rate,
      dailyMax: row.daily_max
    };
  }
  return config.defaultRates[spotType];
}

function getAllRates() {
  return Object.fromEntries(config.spotTypes.map((type) => [type, getRatesForSpotType(type)]));
}

module.exports = { getRatesForSpotType, getAllRates };
