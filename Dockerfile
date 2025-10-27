# Multi-stage Dockerfile for Heroku Deployment
# Timesheet Management System - Full Stack

# ============================================
# Stage 1: Build Frontend (React + Vite)
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build arguments for frontend environment variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build frontend application
RUN npm run build

# ============================================
# Stage 2: Build Backend (Node.js + TypeScript)
# ============================================
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy backend source code
COPY backend/src ./src

# Build TypeScript to JavaScript
RUN npm run build

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:18-alpine AS production

# Install required utilities
RUN apk add --no-cache curl

WORKDIR /app

# ----------------
# Setup Backend
# ----------------
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built backend from builder stage
COPY --from=backend-builder /app/backend/dist ./dist

# ----------------
# Setup Frontend
# ----------------
WORKDIR /app/frontend

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./dist

# ----------------
# Create Startup Script
# ----------------
# Backend will serve both API and static frontend files
WORKDIR /app
RUN printf '#!/bin/sh\n\
echo "Starting Timesheet Management System..."\n\
echo "PORT: $PORT"\n\
echo "NODE_ENV: $NODE_ENV"\n\
\n\
cd /app/backend\n\
echo "Starting Backend API (will serve frontend static files)..."\n\
NODE_ENV=${NODE_ENV:-production} PORT=${PORT:-3000} node dist/index.js\n\
' > /app/start.sh

RUN chmod +x /app/start.sh

# ----------------
# Environment Variables
# ----------------
ENV NODE_ENV=production
ENV PORT=3000

# ----------------
# Expose Port (Heroku assigns dynamically)
# ----------------
EXPOSE ${PORT}

# ----------------
# Health Check
# ----------------
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || curl -f http://localhost:${PORT}/ || exit 1

# ----------------
# Start Application
# ----------------
CMD ["/app/start.sh"]
