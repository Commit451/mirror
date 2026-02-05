#!/bin/bash
set -e

# Deploy script for the mirror site
# This script:
# 1. Uploads new site files from ../dist
# 2. Deploys the worker
#
# NOTE: Automatic cleanup is not yet implemented due to wrangler limitations.
# To manually clean up old files:
#   1. Go to Cloudflare Dashboard > R2 > mirror bucket
#   2. Delete files you no longer need (keeping paths in deploy-config.txt)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/deploy-config.txt"
DIST_DIR="$SCRIPT_DIR/../dist"
BUCKET_NAME="mirror"

echo "=== Mirror Site Deployment ==="
echo ""

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
  echo "Error: dist directory not found at $DIST_DIR"
  echo "Please run 'npm run build' first"
  exit 1
fi

# Show ignore paths from config file (for reference)
if [ -f "$CONFIG_FILE" ]; then
  echo "Paths configured to preserve (manual cleanup only):"
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    # Trim whitespace
    line=$(echo "$line" | xargs)
    echo "  - $line"
  done < "$CONFIG_FILE"
  echo ""
fi

# Step 1: Upload new site files
echo "Step 1: Uploading site files from $DIST_DIR..."
UPLOADED_COUNT=0

for file in $(find "$DIST_DIR" -type f); do
  # Get the path relative to dist/
  key="${file#$DIST_DIR/}"

  # Determine content type
  content_type="application/octet-stream"
  case "$file" in
    *.html) content_type="text/html; charset=utf-8" ;;
    *.css) content_type="text/css; charset=utf-8" ;;
    *.js) content_type="application/javascript; charset=utf-8" ;;
    *.json) content_type="application/json" ;;
    *.svg) content_type="image/svg+xml" ;;
    *.png) content_type="image/png" ;;
    *.jpg|*.jpeg) content_type="image/jpeg" ;;
    *.ico) content_type="image/x-icon" ;;
  esac

  echo "  Uploading: $key"
  wrangler r2 object put "$BUCKET_NAME/$key" --file="$file" --content-type="$content_type" --remote
  ((UPLOADED_COUNT++))
done

echo "Upload complete: $UPLOADED_COUNT files uploaded"
echo ""

# Step 2: Deploy worker
echo "Step 2: Deploying worker..."
cd "$SCRIPT_DIR"
wrangler deploy

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "NOTE: Old site files are not automatically deleted."
echo "If you've renamed or removed files, you may want to clean them up manually"
echo "via the Cloudflare Dashboard (R2 > $BUCKET_NAME bucket)."
echo "Remember to preserve paths listed in deploy-config.txt (e.g., gradle/)."
