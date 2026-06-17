export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(message = "Resource not found") {
  return new ApiError(404, message);
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(error, _req, res, _next) {
  if (error?.name === "ZodError") {
    return res.status(400).json({
      error: "Validation failed",
      details: error.errors,
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      error: "Duplicate resource",
      details: error.keyValue,
    });
  }

  const status = error?.status ?? 500;
  const payload = {
    error: status >= 500 ? "Internal server error" : error.message,
  };

  if (error?.details) payload.details = error.details;
  if (status >= 500) console.error(error);

  return res.status(status).json(payload);
}
