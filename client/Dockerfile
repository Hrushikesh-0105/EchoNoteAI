# Build context is the repo root (npm workspace with a single root lockfile):
#   docker build -f client/Dockerfile .

# ---- deps: install the client workspace's packages ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w client

# ---- dev: Vite dev server; source is bind-mounted over /app/client by docker-compose.dev.yml ----
FROM deps AS dev
ENV PATH=/app/node_modules/.bin:$PATH
COPY client/ client/
WORKDIR /app/client
EXPOSE 5173
CMD ["vite", "--host", "0.0.0.0", "--port", "5173"]
