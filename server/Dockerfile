# Build context is the repo root (npm workspace with a single root lockfile):
#   docker build -f server/Dockerfile .

# ---- deps: install the server workspace's packages ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w server

# ---- dev: source is bind-mounted over /app/server by docker-compose.dev.yml ----
FROM deps AS dev
ENV NODE_ENV=development
ENV PATH=/app/node_modules/.bin:$PATH
COPY server/ server/
WORKDIR /app/server
EXPOSE 3000
# --legacy-watch polls for changes: file events from Windows bind mounts don't reach Linux containers
CMD ["nodemon", "--legacy-watch", "server.js"]
