const db = require('../db');
const { normalizePlate } = require('../utils/validators');

function getByPlate(req, res) {
  const licensePlate = normalizePlate(req.params.licensePlate);

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE license_plate = ?').get(licensePlate);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const sessions = db
    .prepare(
      `SELECT ps.id, ps.check_in_time, ps.check_out_time, ps.duration_minutes, ps.amount, ps.status,
              sp.spot_number, sp.floor
       FROM parking_sessions ps
       JOIN parking_spots sp ON sp.id = ps.parking_spot_id
       WHERE ps.vehicle_id = ?
       ORDER BY ps.check_in_time DESC`
    )
    .all(vehicle.id);

  res.json({ vehicle, sessions });
}

module.exports = { getByPlate };
