# syntax=docker/dockerfile:1

# ── Stage 0: Generate lock files ─────────────────────────────────────
FROM node:25-alpine AS lockfile-gen

WORKDIR /frontend
COPY frontend/package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --package-lock-only

WORKDIR /backend
COPY backend/package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --package-lock-only

# ── Stage 1: Build frontend ───────────────────────────────────────────
FROM node:25-alpine AS frontend-builder

# Injected by CI from the git tag; falls back to "dev" for local builds
ARG VERSION=dev
ENV VERSION=${VERSION}

WORKDIR /app

COPY frontend/package.json ./
COPY --from=lockfile-gen /frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────────────
FROM node:25-alpine AS backend-builder

WORKDIR /app

COPY backend/package.json ./
COPY --from=lockfile-gen /backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY backend/ ./
RUN npx tsc

# ── Stage 3: Runtime ──────────────────────────────────────────────────
FROM node:25-alpine AS runtime

# Build-time arguments injected by CI (fall back to "dev" for local builds)
ARG VERSION=dev
ARG GIT_REVISION=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="Fuely" \
      org.opencontainers.image.description="Real-time fuel price web app powered by Tankerkoenig" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_REVISION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.authors="shephirt" \
      org.opencontainers.image.url="https://github.com/shephirt/fuely" \
      org.opencontainers.image.source="https://github.com/shephirt/fuely" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Create non-root user with explicit UID/GID
RUN addgroup -g 1001 -S fuely && \
    adduser -u 1001 -S fuely -G fuely

# Install production dependencies only
COPY backend/package.json ./
COPY --from=lockfile-gen /backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy compiled backend from backend-builder stage
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/dist ./public

# Create data directory for favorites persistence and set ownership
RUN mkdir -p /app/data && \
    chown -R fuely:fuely /app

VOLUME ["/app/data"]

USER fuely

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["dist/index.js"]
