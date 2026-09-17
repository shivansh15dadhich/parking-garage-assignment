const clock = require('../utils/clock');
const { runAutoCloseJob } = require('../services/autoClose');

function getClock(req, res) {
  res.json({ now: clock.now().toISOString(), isVirtual: clock.isVirtual() });
}

function postClock(req, res) {
  const { now, advanceHours, reset } = req.body || {};
  let newTime;

  if (reset) {
    newTime = clock.setNow(null);
  } else if (now) {
    const parsed = new Date(now);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: '"now" must be a valid ISO date string' });
    }
    newTime = clock.setNow(parsed);
  } else if (advanceHours != null) {
    const hours = Number(advanceHours);
    if (Number.isNaN(hours)) {
      return res.status(400).json({ error: '"advanceHours" must be a number' });
    }
    const base = clock.now();
    base.setHours(base.getHours() + hours);
    newTime = clock.setNow(base);
  } else {
    return res.status(400).json({ error: 'Provide one of: "now" (ISO string), "advanceHours" (number), "reset": true' });
  }

  const { closedSessions } = runAutoCloseJob();

  res.json({
    message: 'Clock updated; nightly auto-close job run',
    time: newTime.toISOString(),
    autoClosed: closedSessions
  });
}

module.exports = { getClock, postClock };
