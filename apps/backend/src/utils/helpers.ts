// Utility functions for backend

export function formatResponse<T>(data: T, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

export function formatError(error: string, status = 400) {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };
}

export function healthCheck() {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
}
