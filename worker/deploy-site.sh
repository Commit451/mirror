#!/bin/bash
set -e

# Deploy script for the mirror site
# This script:
# 1. Cleans up old site files from R2 (preserving configured paths)
# 2. Uploads new site files from ../dist
# 3. Deploys the worker

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

# Read ignore paths from config file
IGNORE_PATHS=()
if [ -f "$CONFIG_FILE" ]; then
  echo "Reading deployment config from $CONFIG_FILE"
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    # Trim whitespace
    line=$(echo "$line" | xargs)
    IGNORE_PATHS+=("$line")
  done < "$CONFIG_FILE"

  echo "Paths to preserve:"
  for path in "${IGNORE_PATHS[@]}"; do
    echo "  - $path"
  done
  echo ""
else
  echo "Warning: Config file not found at $CONFIG_FILE"
  echo "Proceeding without ignore paths"
  echo ""
fi

# Step 1: Clean up old site files
echo "Step 1: Cleaning up old site files from R2..."
echo "Listing all objects in bucket..."
wrangler r2 object list "$BUCKET_NAME" --output json > /tmp/r2_objects.json

echo "Processing objects for deletion..."
DELETED_COUNT=0
SKIPPED_COUNT=0

jq -r '.objects[].key' /tmp/r2_objects.json | while read -r key; do
  should_delete=true

  # Check if key matches any ignore pattern
  for ignore_path in "${IGNORE_PATHS[@]}"; do
    if [[ "$key" == "$ignore_path"* ]]; then
      echo "  Skipping (ignored): $key"
      ((SKIPPED_COUNT++))
      should_delete=false
      break
    fi
  done

  # Delete if not ignored
  if [ "$should_delete" = true ]; then
    echo "  Deleting: $key"
    wrangler r2 object delete "$BUCKET_NAME/$key"
    ((DELETED_COUNT++))
  fi
done

echo "Cleanup complete: $DELETED_COUNT deleted, $SKIPPED_COUNT skipped"
echo ""

# Step 2: Upload new site files
echo "Step 2: Uploading new site files from $DIST_DIR..."
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

  echo "  Uploading: $key ($content_type)"
  wrangler r2 object put "$BUCKET_NAME/$key" --file="$file" --content-type="$content_type"
  ((UPLOADED_COUNT++))
done

echo "Upload complete: $UPLOADED_COUNT files uploaded"
echo ""

# Step 3: Deploy worker
echo "Step 3: Deploying worker..."
cd "$SCRIPT_DIR"
wrangler deploy

echo ""
echo "=== Deployment Complete ==="
