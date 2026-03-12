FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY server/package.json server/package-lock.json* ./

# Install production dependencies only (skip sqlite3 devDependency)
RUN npm ci --production --ignore-scripts 2>/dev/null || npm install --production --ignore-scripts

# Copy server source code
COPY server/ ./

# Expose Egg.js default port
EXPOSE 7001

# Run in foreground (no --daemon) so Docker can manage the process
CMD ["npm", "run", "docker-start"]
