# ═════════════════════════════════════════════════════════════════════════════
# DEV STAGES  (used by compose.yml — docker compose up)
# ═════════════════════════════════════════════════════════════════════════════

# ── Go dev: Air hot-reload ────────────────────────────────────────────────────
FROM golang:1.22-alpine AS go-dev

RUN apk add --no-cache git && \
    go install github.com/air-verse/air@v1.52.3

ENV CGO_ENABLED=0
WORKDIR /app

# Pre-download modules (cache layer — invalidated only when go.mod changes)
COPY go.mod go.sum ./
RUN go mod download

# Source code is bind-mounted at runtime via compose.yml
EXPOSE 8080
CMD ["air", "-c", ".air.toml"]

# ── Next.js dev: install deps then run dev server ─────────────────────────────
FROM node:22-alpine AS web-dev

WORKDIR /app/web

# Install deps (cache layer — invalidated only when package.json changes)
COPY web/package.json web/package-lock.json* ./
RUN npm ci --prefer-offline

# Source code is bind-mounted at runtime via compose.yml.
# node_modules is kept inside the container (named volume) so the host
# filesystem doesn't shadow it.
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ═════════════════════════════════════════════════════════════════════════════
# PRODUCTION STAGES  (used by Cloud Build / docker build)
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the Next.js static export
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS web-builder

WORKDIR /app/web

# Install dependencies (cached layer)
COPY web/package.json web/package-lock.json* ./
RUN npm ci --prefer-offline

# Copy source and build
COPY web/ .

# Inject public Firebase env vars at build time (passed via Cloud Build substitutions)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

RUN npm run build
# output: 'export' produces the static site in web/out/

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build the Go binary
# ─────────────────────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS go-builder

# Required for CGO-free build on Alpine
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

WORKDIR /app

# Cache Go module downloads
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build a statically linked binary
COPY . .
RUN go build \
    -ldflags="-w -s" \
    -trimpath \
    -o /teamsens \
    ./cmd/api

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Minimal runtime image
# ─────────────────────────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS runtime

# Copy the compiled binary
COPY --from=go-builder /teamsens /teamsens

# Copy the static Next.js export → served by Go from ./static
COPY --from=web-builder /app/web/out /static

# Cloud Run requires the container to listen on $PORT (default 8080)
EXPOSE 8080
ENV PORT=8080

# Run as non-root (distroless default uid 65532)
USER nonroot:nonroot

ENTRYPOINT ["/teamsens"]
