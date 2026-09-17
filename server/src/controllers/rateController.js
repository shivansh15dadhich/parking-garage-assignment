const { getAllRates } = require('../services/rates');
const { importRatesFromCsv } = require('../db/importRates');

function getRates(req, res) {
  res.json({ rates: getAllRates() });
}

function importRates(req, res) {
  const { csv } = req.body || {};
  if (!csv || typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({ error: 'Body must include a non-empty "csv" string' });
  }

  const { imported, skipped } = importRatesFromCsv(csv);
  if (imported.length === 0) {
    return res.status(400).json({ error: 'No valid rate rows found in the provided data', skipped });
  }

  res.json({ message: 'Rate card imported', imported, skipped, rates: getAllRates() });
}

module.exports = { getRates, importRates };
