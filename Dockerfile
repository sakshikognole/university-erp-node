# ── Stage 1: Install dependencies ─────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# ── Stage 2: Production image ──────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

# Copy only production node_modules from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Remove .env if accidentally included (use docker-compose env_file instead)
RUN rm -f .env .env.local

EXPOSE 5000
CMD ["node", "server.js"]
