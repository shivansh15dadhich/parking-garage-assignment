const db = require('../db');
const config = require('../config');
const clock = require('../utils/clock');
const { assignSpot } = require('../services/spotAssignment');
const { calculateFee, calculateDurationMinutes } = require('../services/feeCalculator');
const { getRatesForSpotType } = require('../services/rates');
const {
  isValidLicensePlate,
  isValidVehicleType,
  normalizePlate
} = require('../utils/validators');

function checkIn(req, res) {
  let { licensePlate, vehicleType } = req.body;

  if (!isValidLicensePlate(licensePlate)) {
    return res.status(400).json({ error: 'A valid license plate is required' });
  }
  if (!isValidVehicleType(vehicleType)) {
    return res.status(400).json({ error: `Vehicle type must be one of: ${config.vehicleTypes.join(', ')}` });
  }
  licensePlate = normalizePlate(licensePlate);

  let vehicle = db.prepare('SELECT * FROM vehicles WHERE license_plate = ?').get(licensePlate);
  if (!vehicle) {
    const result = db
      .prepare('INSERT INTO vehicles (license_plate, vehicle_type) VALUES (?, ?)')
      .run(licensePlate, vehicleType);
    vehicle = { id: result.lastInsertRowid, license_plate: licensePlate, vehicle_type: vehicleType };
  } else {

    if (vehicle.vehicle_type !== vehicleType) {
      return res.status(400).json({
        error: `This license plate is registered as ${vehicle.vehicle_type}, not ${vehicleType}`
      });
    }
  }

  const activeSession = db
    .prepare(`SELECT * FROM parking_sessions WHERE vehicle_id = ? AND status = 'ACTIVE'`)
    .get(vehicle.id);
  if (activeSession) {
    return res.status(409).json({ error: 'This vehicle is already checked in' });
  }

  const availableSpots = db
    .prepare('SELECT * FROM parking_spots WHERE is_occupied = 0')
    .all();
  const spot = assignSpot(vehicleType, availableSpots);

  if (!spot) {
    const message =
      vehicleType === 'EV'
        ? 'No EV spot is currently available.'
        : 'Currently no suitable parking spot is available.';
    return res.status(409).json({ error: message });
  }

  const checkInTime = clock.now().toISOString();
  const doCheckIn = db.transaction(() => {
    db.prepare('UPDATE parking_spots SET is_occupied = 1 WHERE id = ?').run(spot.id);
    const result = db
      .prepare(
        `INSERT INTO parking_sessions (vehicle_id, parking_spot_id, check_in_time, status)
         VALUES (?, ?, ?, 'ACTIVE')`
      )
      .run(vehicle.id, spot.id, checkInTime);
    return result.lastInsertRowid;
  });

  let sessionId;
  try {
    sessionId = doCheckIn();
  } catch (err) {
    return res.status(409).json({ error: 'That spot or vehicle was just taken. Please try again.' });
  }

  const session = db
    .prepare(
      `SELECT ps.id, ps.check_in_time, v.license_plate, v.vehicle_type,
              sp.spot_number, sp.floor
       FROM parking_sessions ps
       JOIN vehicles v ON v.id = ps.vehicle_id
       JOIN parking_spots sp ON sp.id = ps.parking_spot_id
       WHERE ps.id = ?`
    )
    .get(sessionId);

  res.status(201).json({ message: 'Vehicle checked in successfully', session });
}

function checkOut(req, res) {
  let { licensePlate } = req.body;
  if (!isValidLicensePlate(licensePlate)) {
    return res.status(400).json({ error: 'A valid license plate is required' });
  }
  licensePlate = normalizePlate(licensePlate);

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE license_plate = ?').get(licensePlate);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  const session = db
    .prepare(`SELECT * FROM parking_sessions WHERE vehicle_id = ? AND status = 'ACTIVE'`)
    .get(vehicle.id);
  if (!session) {
    return res.status(409).json({ error: 'This vehicle is not currently parked' });
  }

  const spot = db.prepare('SELECT * FROM parking_spots WHERE id = ?').get(session.parking_spot_id);
  const checkOutTime = clock.now().toISOString();
  const durationMinutes = calculateDurationMinutes(session.check_in_time, checkOutTime);
  const amount = calculateFee(durationMinutes, getRatesForSpotType(spot.spot_type));

  const doCheckOut = db.transaction(() => {
    db.prepare(
      `UPDATE parking_sessions
       SET check_out_time = ?, duration_minutes = ?, amount = ?, status = 'COMPLETED'
       WHERE id = ?`
    ).run(checkOutTime, durationMinutes, amount, session.id);
    db.prepare('UPDATE parking_spots SET is_occupied = 0 WHERE id = ?').run(session.parking_spot_id);
  });
  doCheckOut();

  const receipt = db
    .prepare(
      `SELECT ps.id, ps.check_in_time, ps.check_out_time, ps.duration_minutes, ps.amount,
              v.license_plate, v.vehicle_type, sp.spot_number, sp.floor
       FROM parking_sessions ps
       JOIN vehicles v ON v.id = ps.vehicle_id
       JOIN parking_spots sp ON sp.id = ps.parking_spot_id
       WHERE ps.id = ?`
    )
    .get(session.id);

  res.json({ message: 'Vehicle checked out successfully', receipt });
}

function getActive(req, res) {
  const rows = db
    .prepare(
      `SELECT ps.id, ps.check_in_time, v.license_plate, v.vehicle_type,
              sp.spot_number, sp.floor
       FROM parking_sessions ps
       JOIN vehicles v ON v.id = ps.vehicle_id
       JOIN parking_spots sp ON sp.id = ps.parking_spot_id
       WHERE ps.status = 'ACTIVE'
       ORDER BY ps.check_in_time DESC`
    )
    .all();
  res.json({ vehicles: rows });
}

function getHistory(req, res) {
  let page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 10;
  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 10;

  let sortBy = req.query.sortBy || 'check_in_time';
  let order = (req.query.order || 'desc').toLowerCase();

  if (!config.sortableHistoryFields.includes(sortBy)) {
    return res.status(400).json({
      error: `Invalid sortBy field. Allowed: ${config.sortableHistoryFields.join(', ')}`
    });
  }
  if (!['asc', 'desc'].includes(order)) {
    return res.status(400).json({ error: 'order must be "asc" or "desc"' });
  }

  const sortColumnMap = {
    check_in_time: 'ps.check_in_time',
    check_out_time: 'ps.check_out_time',
    amount: 'ps.amount',
    license_plate: 'v.license_plate'
  };
  const sortColumn = sortColumnMap[sortBy];

  const totalRow = db.prepare('SELECT COUNT(*) as count FROM parking_sessions').get();
  const total = totalRow.count;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT ps.id, ps.check_in_time, ps.check_out_time, ps.duration_minutes, ps.amount, ps.status,
              v.license_plate, v.vehicle_type, sp.spot_number, sp.floor
       FROM parking_sessions ps
       JOIN vehicles v ON v.id = ps.vehicle_id
       JOIN parking_spots sp ON sp.id = ps.parking_spot_id
       ORDER BY ${sortColumn} ${order.toUpperCase()}
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  res.json({
    records: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
}

function search(req, res) {
  const { licensePlate } = req.query;
  if (!licensePlate || !licensePlate.trim()) {
    return res.status(400).json({ error: 'licensePlate query param is required' });
  }
  const normalized = normalizePlate(licensePlate);

  const vehicle = db
    .prepare('SELECT * FROM vehicles WHERE license_plate LIKE ?')
    .get(`%${normalized}%`);

  if (!vehicle) {
    return res.status(404).json({ error: 'No vehicle found matching that license plate' });
  }

  const activeSession = db
    .prepare(
      `SELECT ps.id, ps.check_in_time, sp.spot_number, sp.floor
       FROM parking_sessions ps
       JOIN parking_spots sp ON sp.id = ps.parking_spot_id
       WHERE ps.vehicle_id = ? AND ps.status = 'ACTIVE'`
    )
    .get(vehicle.id);

  res.json({
    vehicle: {
      licensePlate: vehicle.license_plate,
      vehicleType: vehicle.vehicle_type
    },
    status: activeSession ? 'PARKED' : 'NOT PARKED',
    currentSpot: activeSession ? activeSession.spot_number : null,
    floor: activeSession ? activeSession.floor : null,
    checkInTime: activeSession ? activeSession.check_in_time : null
  });
}

function transfer(req, res) {
  let { fromLicensePlate, toLicensePlate, toVehicleType } = req.body;

  if (!isValidLicensePlate(fromLicensePlate) || !isValidLicensePlate(toLicensePlate)) {
    return res.status(400).json({ error: 'Both fromLicensePlate and toLicensePlate are required' });
  }
  fromLicensePlate = normalizePlate(fromLicensePlate);
  toLicensePlate = normalizePlate(toLicensePlate);

  if (fromLicensePlate === toLicensePlate) {
    return res.status(400).json({ error: 'toLicensePlate must be different from fromLicensePlate' });
  }

  const fromVehicle = db.prepare('SELECT * FROM vehicles WHERE license_plate = ?').get(fromLicensePlate);
  if (!fromVehicle) {
    return res.status(404).json({ error: 'fromLicensePlate is not a known vehicle' });
  }

  const session = db
    .prepare(`SELECT * FROM parking_sessions WHERE vehicle_id = ? AND status = 'ACTIVE'`)
    .get(fromVehicle.id);
  if (!session) {
    return res.status(409).json({ error: 'fromLicensePlate does not have an open parking session' });
  }

  const spot = db.prepare('SELECT * FROM parking_spots WHERE id = ?').get(session.parking_spot_id);
  const compatibleTypes = config.spotCompatibility;

  let toVehicle = db.prepare('SELECT * FROM vehicles WHERE license_plate = ?').get(toLicensePlate);
  if (toVehicle) {
    const toActiveSession = db
      .prepare(`SELECT * FROM parking_sessions WHERE vehicle_id = ? AND status = 'ACTIVE'`)
      .get(toVehicle.id);
    if (toActiveSession) {
      return res.status(409).json({ error: 'toLicensePlate is already checked in elsewhere' });
    }
    if (!compatibleTypes[toVehicle.vehicle_type].includes(spot.spot_type)) {
      return res.status(400).json({
        error: `toLicensePlate is registered as ${toVehicle.vehicle_type}, which cannot use this ${spot.spot_type} spot`
      });
    }
  } else {
    if (!isValidVehicleType(toVehicleType)) {
      return res.status(400).json({
        error: `toVehicleType must be one of: ${config.vehicleTypes.join(', ')} when toLicensePlate is a new vehicle`
      });
    }
    if (!compatibleTypes[toVehicleType].includes(spot.spot_type)) {
      return res.status(400).json({
        error: `toVehicleType (${toVehicleType}) cannot use this ${spot.spot_type} spot`
      });
    }
  }

  const doTransfer = db.transaction(() => {
    if (!toVehicle) {
      const result = db
        .prepare('INSERT INTO vehicles (license_plate, vehicle_type) VALUES (?, ?)')
        .run(toLicensePlate, toVehicleType);
      toVehicle = { id: result.lastInsertRowid };
    }
    db.prepare('UPDATE parking_sessions SET vehicle_id = ? WHERE id = ?').run(toVehicle.id, session.id);
  });

  try {
    doTransfer();
  } catch (err) {
    return res.status(409).json({ error: 'Transfer failed — please retry' });
  }

  const updated = db
    .prepare(
      `SELECT ps.id, ps.check_in_time, v.license_plate, v.vehicle_type,
              sp.spot_number, sp.floor
       FROM parking_sessions ps
       JOIN vehicles v ON v.id = ps.vehicle_id
       JOIN parking_spots sp ON sp.id = ps.parking_spot_id
       WHERE ps.id = ?`
    )
    .get(session.id);

  res.json({ message: `Session transferred from ${fromLicensePlate} to ${toLicensePlate}`, session: updated });
}

module.exports = { checkIn, checkOut, getActive, getHistory, search, transfer };
