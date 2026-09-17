const db = require('../db');

function getAllSpots(req, res) {
  const spots = db.prepare('SELECT * FROM parking_spots ORDER BY floor, spot_number').all();
  res.json({ spots });
}

function getAvailableSpots(req, res) {
  const spots = db
    .prepare('SELECT * FROM parking_spots WHERE is_occupied = 0 ORDER BY floor, spot_number')
    .all();
  res.json({ spots });
}

function getAvailableEvSpots(req, res) {
  const spots = db
    .prepare(`SELECT * FROM parking_spots WHERE is_occupied = 0 AND spot_type = 'EV' ORDER BY floor, spot_number`)
    .all();
  res.json({ available: spots.length, spots });
}

module.exports = { getAllSpots, getAvailableSpots, getAvailableEvSpots };
