#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
test -s .env
docker compose --env-file .env -f deploy/compose.staging.yaml config --quiet
docker compose --env-file .env -f deploy/compose.staging.yaml up -d --build --wait --wait-timeout 240
docker compose --env-file .env -f deploy/compose.staging.yaml ps
