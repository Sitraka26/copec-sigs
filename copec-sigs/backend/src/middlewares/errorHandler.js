function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const enProduction = process.env.NODE_ENV === 'production';
  const message = enProduction ? 'Une erreur interne est survenue.' : err.message || 'Erreur interne du serveur';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;