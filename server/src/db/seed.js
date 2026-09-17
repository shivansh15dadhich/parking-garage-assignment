const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./index');
const { importRatesFromCsv } = require('./importRates');

const spots = [

  { spot_number: 'C-101', floor: 1, spot_type: 'COMPACT' },
  { spot_number: 'C-102', floor: 1, spot_type: 'COMPACT' },
  { spot_number: 'S-103', floor: 1, spot_type: 'STANDARD' },
  { spot_number: 'S-104', floor: 1, spot_type: 'STANDARD' },
  { spot_number: 'EV-105', floor: 1, spot_type: 'EV' },

  { spot_number: 'C-201', floor: 2, spot_type: 'COMPACT' },
  { spot_number: 'S-202', floor: 2, spot_type: 'STANDARD' },
  { spot_number: 'EV-203', floor: 2, spot_type: 'EV' }
];

const insertSpot = db.prepare(
  `INSERT OR IGNORE INTO parking_spots (spot_number, floor, spot_type) VALUES (?, ?, ?)`
);

const insertUser = db.prepare(
  `INSERT OR IGNORE INTO users (name, email, password_hash) VALUES (?, ?, ?)`
);

function seed() {
  const insertManySpots = db.transaction((rows) => {
    for (const s of rows) insertSpot.run(s.spot_number, s.floor, s.spot_type);
  });
  insertManySpots(spots);

  const demoPasswordHash = bcrypt.hashSync('password123', 10);
  insertUser.run('Demo Attendant', 'attendant@garage.com', demoPasswordHash);

  const rawRateCard = fs.readFileSync(path.join(__dirname, '../data/rateCard.raw.csv'), 'utf8');
  const { imported, skipped } = importRatesFromCsv(rawRateCard);
  console.log(`Imported rates for: ${imported.join(', ')} (skipped ${skipped.length} junk row(s) from the messy rate card)`);

  console.log('Seed complete.');
  console.log('Demo login -> email: attendant@garage.com, password: password123');
}

seed();
