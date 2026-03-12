'use strict';

// Disable Redis in production when no REDIS_ADDRESS is configured
// Cloud Hosting does not provide managed Redis by default
exports.redis = {
  enable: !!process.env.REDIS_ADDRESS,
  package: 'egg-redis',
};
