# GitLab Feedback Collector - Docker Image (Bun + SQLite)
# Build: docker build -t gitlab-feedback-collector .
# Run (example):
#   docker run -d \
#     -e GITLAB_BASE_URL=https://gitlab.example.com \
#     -e GITLAB_TOKEN=xxxxx \
#     -e GITLAB_WEBHOOK_SECRET=yourSecret \
#     -e PORT=3000 \
#     -p 3000:3000 \
#     -v feedback_data:/app/data \
#     --name gitlab-feedback-collector gitlab-feedback-collector

FROM oven/bun:1 AS runtime

WORKDIR /app

# Copy manifest & lock first for better layer caching
COPY package.json bun.lock* ./

# Install dependencies (currently only devDependencies, but keeps future prod deps cached)
RUN bun install --frozen-lockfile

# Copy source code & assets (no dev-only files like tests included explicitly)
COPY src ./src
COPY assets ./assets
COPY README.md ./

# Prepare data directory for SQLite (default DB_PATH=./data/app.db)
RUN mkdir -p /app/data

# Environment defaults (override at runtime)
ENV PORT=3000 \
    DB_PATH=./data/app.db \
    NODE_ENV=production

# Expose application port
EXPOSE 3000

# Declare volume so DB survives container recreation
VOLUME ["/app/data"]

# Start the server
CMD ["bun", "run", "start"]
