const express = require('express');
const { getRates, importRates } = require('../controllers/rateController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getRates);
router.post('/import', importRates);

module.exports = router;
