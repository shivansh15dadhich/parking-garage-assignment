const express = require('express');
const { getByPlate } = require('../controllers/vehicleController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/:licensePlate', getByPlate);

module.exports = router;
