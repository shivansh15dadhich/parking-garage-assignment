const express = require('express');
const { checkIn, checkOut, getActive, getHistory, search, transfer } = require('../controllers/parkingController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/transfer', transfer);
router.get('/active', getActive);
router.get('/history', getHistory);
router.get('/search', search);

module.exports = router;
