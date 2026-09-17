const express = require('express');
const { getAllSpots, getAvailableSpots, getAvailableEvSpots } = require('../controllers/spotController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/available/ev', getAvailableEvSpots);
router.get('/available', getAvailableSpots);
router.get('/', getAllSpots);

module.exports = router;
