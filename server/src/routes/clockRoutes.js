const express = require('express');
const { getClock, postClock } = require('../controllers/clockController');

const router = express.Router();

router.get('/', getClock);
router.post('/', postClock);

module.exports = router;
