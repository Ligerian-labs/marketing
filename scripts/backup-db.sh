#!/usr/bin/env bash
# Backup SQLite database
# Usage: ./backup-db.sh [backup_dir]
# Creates a timestamped copy using SQLite's backup API (safe for WAL mode)

set -euo pipefail

DB_PATH="${DB_PATH:-/app/data/ligerian.db}"
BACKUP_DIR="${1:-/app/data/backups}"
TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ligerian_${TIMESTAMP}.db"
MAX_BACKUPS=30  # Keep last 30 backups

mkdir -p "$BACKUP_DIR"

# Use SQLite's .backup command (safe even with WAL mode / active connections)
if [ -f "$DB_PATH" ]; then
  sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"
  echo "[BACKUP] Created: ${BACKUP_FILE} ($(du -h "$BACKUP_FILE" | cut -f1))"
  
  # Rotate old backups (keep last N)
  ls -t "${BACKUP_DIR}"/ligerian_*.db 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
  echo "[BACKUP] Kept last ${MAX_BACKUPS} backups"
else
  echo "[BACKUP] No database found at ${DB_PATH}, skipping"
fi
