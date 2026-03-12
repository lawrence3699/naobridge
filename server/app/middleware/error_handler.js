'use strict';

const STATUS_TO_CODE = {
  400: 1001,
  401: 1002,
  403: 1002,
  404: 1003,
  409: 1001,
  422: 1001,
};

const DEFAULT_ERROR_CODE = 2001;

/**
 * Error handler middleware.
 * Catches all errors and returns a unified JSON response format.
 */
module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      const status = err.status || 500;
      const code = STATUS_TO_CODE[status] || DEFAULT_ERROR_CODE;

      ctx.status = status;
      ctx.body = {
        code,
        data: null,
        message: formatErrorMessage(err, status),
      };

      // Log server errors for debugging
      if (status >= 500) {
        ctx.logger.error('[ErrorHandler] Internal error:', err);
      }
    }
  };
};

/**
 * Format error message based on status and error type.
 * For validation errors (422), extracts and joins field-level messages.
 * @param {Error} err - the caught error
 * @param {number} status - HTTP status code
 * @returns {string} human-readable error message
 */
function formatErrorMessage(err, status) {
  if (status === 422 && err.errors) {
    const messages = err.errors.map(e => {
      const field = e.field || '';
      const msg = e.message || '';
      return field ? `${field}: ${msg}` : msg;
    });
    return messages.join('; ');
  }

  if (status >= 500) {
    return '服务器内部错误，请稍后再试';
  }

  return err.message || '未知错误';
}
