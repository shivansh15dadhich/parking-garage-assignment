const { spotTypes } = require('../config');

const TYPE_ALIASES = {
  COMPACT: 'COMPACT',
  COMP: 'COMPACT',
  'COMPACT CAR': 'COMPACT',
  STANDARD: 'STANDARD',
  STD: 'STANDARD',
  REGULAR: 'STANDARD',
  EV: 'EV',
  ELECTRIC: 'EV',
  'EV (CHARGER)': 'EV'
};

function normalizeSpotType(raw) {
  if (raw == null) return null;
  const key = String(raw).trim().toUpperCase();
  if (TYPE_ALIASES[key]) return TYPE_ALIASES[key];
  return spotTypes.includes(key) ? key : null;
}

function cleanMoney(raw) {
  if (raw == null) return NaN;
  const stripped = String(raw).replace(/[₹$,\s]/g, '');
  if (stripped === '') return NaN;
  return Number(stripped);
}

function parseRateCard(rawCsv) {
  const lines = String(rawCsv).split(/\r?\n/);
  const rates = {};
  const skipped = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (!line.trim()) return;

    const cols = line.split(',').map((c) => c.trim());
    if (cols.length < 4) {
      skipped.push({ line: lineNumber, reason: 'expected 4 columns', raw: line });
      return;
    }

    const [rawType, rawFirst, rawExtra, rawCap] = cols;
    if (/^spot\s*type$/i.test(rawType)) return;

    const spotType = normalizeSpotType(rawType);
    if (!spotType) {
      skipped.push({ line: lineNumber, reason: `unrecognized spot type "${rawType}"`, raw: line });
      return;
    }

    const firstHourRate = cleanMoney(rawFirst);
    const additionalHourRate = cleanMoney(rawExtra);
    const dailyMax = cleanMoney(rawCap);
    const values = { firstHourRate, additionalHourRate, dailyMax };

    const invalidField = Object.entries(values).find(([, v]) => Number.isNaN(v) || v < 0);
    if (invalidField) {
      skipped.push({ line: lineNumber, reason: `invalid ${invalidField[0]}`, raw: line });
      return;
    }

    rates[spotType] = values;
  });

  return { rates, skipped };
}

module.exports = { parseRateCard };
