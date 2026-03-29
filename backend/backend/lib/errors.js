
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function toSafeError(error) {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError(error?.message || 'Unexpected server error.', 500);
}

module.exports = { AppError, toSafeError };
