CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL,
  spot_type TEXT NOT NULL CHECK (spot_type IN ('COMPACT', 'STANDARD', 'EV')),
  is_occupied INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_plate TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('COMPACT', 'STANDARD', 'EV')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_cards (
  spot_type TEXT PRIMARY KEY CHECK (spot_type IN ('COMPACT', 'STANDARD', 'EV')),
  first_hour_rate REAL NOT NULL,
  additional_hour_rate REAL NOT NULL,
  daily_max REAL NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  parking_spot_id INTEGER NOT NULL REFERENCES parking_spots(id),
  check_in_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out_time DATETIME,
  duration_minutes INTEGER,
  amount REAL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON parking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_vehicle ON parking_sessions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sessions_spot ON parking_sessions(parking_spot_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_spots_type_occupied ON parking_spots(spot_type, is_occupied);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_vehicle
  ON parking_sessions(vehicle_id) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_spot
  ON parking_sessions(parking_spot_id) WHERE status = 'ACTIVE';
