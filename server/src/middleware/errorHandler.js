export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || 'Unexpected server error',
    details: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
}
