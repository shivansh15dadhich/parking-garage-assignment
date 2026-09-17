const db = require('../db');
const clock = require('../utils/clock');

function getDashboard(req, res) {
  const totalSpots = db.prepare('SELECT COUNT(*) as c FROM parking_spots').get().c;
  const occupiedSpots = db.prepare('SELECT COUNT(*) as c FROM parking_spots WHERE is_occupied = 1').get().c;
  const availableSpots = totalSpots - occupiedSpots;

  const evTotal = db.prepare(`SELECT COUNT(*) as c FROM parking_spots WHERE spot_type = 'EV'`).get().c;
  const evOccupied = db
    .prepare(`SELECT COUNT(*) as c FROM parking_spots WHERE spot_type = 'EV' AND is_occupied = 1`)
    .get().c;
  const evAvailable = evTotal - evOccupied;

  const activeVehicles = db
    .prepare(`SELECT COUNT(*) as c FROM parking_sessions WHERE status = 'ACTIVE'`)
    .get().c;

  const todayRevenue = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM parking_sessions
       WHERE status = 'COMPLETED' AND date(check_out_time) = date(?)`
    )
    .get(clock.now().toISOString()).total;

  res.json({
    totalSpots,
    occupiedSpots,
    availableSpots,
    evSpots: { total: evTotal, available: evAvailable },
    activeVehicles,
    todayRevenue
  });
}

module.exports = { getDashboard };
