const db = require('../db');
const clock = require('../utils/clock');
const { calculateFee, calculateDurationMinutes } = require('./feeCalculator');
const { getRatesForSpotType } = require('./rates');

const OVERDUE_THRESHOLD_MINUTES = 24 * 60;

function runAutoCloseJob() {
  const nowIso = clock.now().toISOString();

  const activeSessions = db
    .prepare(
      `SELECT ps.id, ps.check_in_time, ps.parking_spot_id, sp.spot_type, v.license_plate
       FROM parking_sessions ps
       JOIN parking_spots sp ON sp.id = ps.parking_spot_id
       JOIN vehicles v ON v.id = ps.vehicle_id
       WHERE ps.status = 'ACTIVE'`
    )
    .all();

  const overdue = activeSessions
    .map((session) => ({ session, durationMinutes: calculateDurationMinutes(session.check_in_time, nowIso) }))
    .filter(({ durationMinutes }) => durationMinutes > OVERDUE_THRESHOLD_MINUTES);

  const closeSession = db.prepare(
    `UPDATE parking_sessions
     SET check_out_time = ?, duration_minutes = ?, amount = ?, status = 'COMPLETED'
     WHERE id = ?`
  );
  const freeSpot = db.prepare('UPDATE parking_spots SET is_occupied = 0 WHERE id = ?');

  const closedSessions = [];
  const applyAll = db.transaction(() => {
    for (const { session, durationMinutes } of overdue) {
      const rates = getRatesForSpotType(session.spot_type);
      const amount = calculateFee(durationMinutes, rates);
      closeSession.run(nowIso, durationMinutes, amount, session.id);
      freeSpot.run(session.parking_spot_id);
      closedSessions.push({
        sessionId: session.id,
        licensePlate: session.license_plate,
        durationMinutes,
        amount
      });
    }
  });
  applyAll();

  return { ranAt: nowIso, closedSessions };
}

module.exports = { runAutoCloseJob, OVERDUE_THRESHOLD_MINUTES };
