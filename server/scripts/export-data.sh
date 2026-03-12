#!/bin/bash
# Export data from Alibaba Cloud MySQL for migration to Cloud Hosting
#
# Usage: ./export-data.sh [output_dir]
# Default output: ./export/
#
# Prerequisites:
#   - MySQL client (mysql, mysqldump) installed
#   - Network access to 8.141.95.103

set -euo pipefail

MYSQL_HOST="8.141.95.103"
MYSQL_PORT="3306"
MYSQL_USER="eggapp"
MYSQL_DB="tftime"
OUTPUT_DIR="${1:-./export}"

echo "=== NaoBridge Data Export ==="
echo "Source: ${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}"
echo "Output: ${OUTPUT_DIR}"
echo ""

mkdir -p "${OUTPUT_DIR}"

# Prompt for password
read -sp "Enter MySQL password for ${MYSQL_USER}: " MYSQL_PASS
echo ""

# Tables to export (in dependency order for safe import)
TABLES=(
  "users"
  "userprofiles"
  "user_follows"
  "channels"
  "posts"
  "post_images"
  "post_comments"
  "post_likes"
  "post_feedbacks"
  "favorites"
  "notifications"
  "admins"
  "sensitive_words"
)

echo "Exporting ${#TABLES[@]} tables..."

for table in "${TABLES[@]}"; do
  echo "  Exporting ${table}..."
  mysqldump \
    -h "${MYSQL_HOST}" \
    -P "${MYSQL_PORT}" \
    -u "${MYSQL_USER}" \
    -p"${MYSQL_PASS}" \
    --no-create-info \
    --skip-triggers \
    --complete-insert \
    --hex-blob \
    --default-character-set=utf8mb4 \
    "${MYSQL_DB}" "${table}" \
    > "${OUTPUT_DIR}/${table}.sql" 2>/dev/null || echo "    WARNING: ${table} may not exist or is empty"
done

# Also export row counts for verification
echo ""
echo "Row counts (for import verification):"
for table in "${TABLES[@]}"; do
  count=$(mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" -p"${MYSQL_PASS}" \
    -N -e "SELECT COUNT(*) FROM ${table}" "${MYSQL_DB}" 2>/dev/null || echo "0")
  echo "  ${table}: ${count}" | tee -a "${OUTPUT_DIR}/row-counts.txt"
done

echo ""
echo "Export complete. Files in: ${OUTPUT_DIR}/"
echo ""
echo "Next steps:"
echo "  1. Run db-cloud-hosting.sql on Cloud Hosting MySQL"
echo "  2. Import each table: mysql -h <host> -u <user> -p naobridge < export/<table>.sql"
echo "  3. Verify row counts match"
