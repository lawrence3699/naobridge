FROM node:18-alpine

WORKDIR /app

# Environment variables for Cloud Hosting
ENV MYSQL_ADDRESS=10.19.100.41:3306
ENV MYSQL_USERNAME=root
ENV MYSQL_PASSWORD=U6uznp5z
ENV MYSQL_DBNAME=naobridge
ENV JWT_SECRET=4JIIEkP8tHvQMigS757mkIcYod4SDSDq1D3Et8KuJVeRuk9h
ENV WX_APPID=wx7c18fe75931e9951
# TODO: Set WX_APPSECRET - get from mp.weixin.qq.com > 开发管理 > 开发设置
ENV WX_APPSECRET=6bfc65554c7a0439956350d5b6bbe4bf

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
