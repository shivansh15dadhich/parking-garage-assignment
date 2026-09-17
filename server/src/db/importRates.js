const fs = require('fs');
const path = require('path');
const db = require('./index');
const { parseRateCard } = require('../services/rateCardImporter');

const upsertRate = db.prepare(`
  INSERT INTO rate_cards (spot_type, first_hour_rate, additional_hour_rate, daily_max, updated_at)
  VALUES (@spotType, @firstHourRate, @additionalHourRate, @dailyMax, CURRENT_TIMESTAMP)
  ON CONFLICT(spot_type) DO UPDATE SET
    first_hour_rate = excluded.first_hour_rate,
    additional_hour_rate = excluded.additional_hour_rate,
    daily_max = excluded.daily_max,
    updated_at = CURRENT_TIMESTAMP
`);

function importRatesFromCsv(rawCsv) {
  const { rates, skipped } = parseRateCard(rawCsv);

  const applyAll = db.transaction((entries) => {
    for (const [spotType, values] of entries) {
      upsertRate.run({ spotType, ...values });
    }
  });
  applyAll(Object.entries(rates));

  return { imported: Object.keys(rates), skipped };
}

if (require.main === module) {
  const csvPath = path.join(__dirname, '../data/rateCard.raw.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const result = importRatesFromCsv(raw);

  console.log(`Imported clean rates for: ${result.imported.join(', ') || 'none'}`);
  if (result.skipped.length) {
    console.log(`Skipped ${result.skipped.length} junk row(s) from the messy rate card:`);
    result.skipped.forEach((s) => console.log(`  line ${s.line}: ${s.reason} -> "${s.raw}"`));
  }
}

module.exports = { importRatesFromCsv };
