function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = { errorHandler, asyncHandler };
