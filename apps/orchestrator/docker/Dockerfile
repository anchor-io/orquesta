FROM debian:trixie-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential curl git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
ENV PATH="/mise/shims:$PATH"

RUN curl https://mise.run | sh
COPY mise.toml ./
RUN mise trust && mise install
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/orchestrator/package.json apps/orchestrator/
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN pnpm install --frozen-lockfile
COPY apps/orchestrator/ apps/orchestrator/
COPY tsconfig.json ./
RUN pnpm --filter ./apps/orchestrator build

FROM debian:trixie-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /mise /mise
COPY --from=build /usr/local/bin/mise /usr/local/bin/mise

ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV PATH="/mise/shims:$PATH"

WORKDIR /app
COPY --from=build /app ./
COPY apps/orchestrator/docker/entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
