require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: '8h',
  dbPath: process.env.DB_PATH || './parking.db',

  defaultRates: {
    COMPACT: { firstHourRate: 50, additionalHourRate: 30, dailyMax: 250 },
    STANDARD: { firstHourRate: 60, additionalHourRate: 35, dailyMax: 280 },
    EV: { firstHourRate: 80, additionalHourRate: 45, dailyMax: 350 }
  },

  spotCompatibility: {
    COMPACT: ['COMPACT'],
    STANDARD: ['STANDARD'],
    EV: ['EV']
  },

  vehicleTypes: ['COMPACT', 'STANDARD', 'EV'],
  spotTypes: ['COMPACT', 'STANDARD', 'EV'],

  sortableHistoryFields: ['check_in_time', 'check_out_time', 'amount', 'license_plate']
};
