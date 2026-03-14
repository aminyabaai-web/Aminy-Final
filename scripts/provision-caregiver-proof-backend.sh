#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <project-ref> <db-password>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROOF_WORKDIR="$PROJECT_ROOT/caregiver-proof-backend"
PROJECT_REF="$1"
DB_PASSWORD="$2"

supabase link --workdir "$PROOF_WORKDIR" --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"
supabase db push --workdir "$PROOF_WORKDIR" --linked --yes
