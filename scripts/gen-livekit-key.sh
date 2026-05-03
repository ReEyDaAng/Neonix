#!/usr/bin/env bash
# Generate a fresh LiveKit API key + secret pair.
# Usage: ./scripts/gen-livekit-key.sh
set -euo pipefail

API_KEY="API$(openssl rand -hex 4 | tr 'a-f' 'A-F')"
API_SECRET=$(openssl rand -hex 32)

cat <<EOF
LIVEKIT_API_KEY=$API_KEY
LIVEKIT_API_SECRET=$API_SECRET
EOF
