FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# docker build --target test   -> runs the test suite
FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "test"]

FROM base AS deps
RUN npm ci --omit=dev

# default target: small non-root runtime image
FROM node:20-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/server.js"]
