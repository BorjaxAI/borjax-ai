#!/usr/bin/env bash
set -euo pipefail

# Source AWS credentials
source ~/.pi/agent/bedrock.env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BorjaxAI — Frontend Deploy (S3 + Static Website Hosting)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REGION="${AWS_REGION:-us-east-1}"
LANDING_BUCKET="borjaxai-landing"
DOCS_BUCKET="borjaxai-docs"
APP_BUCKET="borjaxai-app"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Create buckets ────────────────────────────────────────────────────────────
create_bucket() {
  local bucket="$1"
  echo "→ Creating bucket: s3://$bucket"
  if [ "$REGION" = "us-east-1" ]; then
    aws s3 mb "s3://$bucket" --region "$REGION" 2>/dev/null || echo "  (already exists)"
  else
    aws s3 mb "s3://$bucket" --region "$REGION" --create-bucket-configuration "LocationConstraint=$REGION" 2>/dev/null || echo "  (already exists)"
  fi

  # Disable block public access
  aws s3api put-public-access-block \
    --bucket "$bucket" \
    --public-access-block-configuration \
      "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" 2>/dev/null || true

  # Enable static website hosting
  aws s3 website "s3://$bucket" \
    --index-document index.html \
    --error-document index.html

  # Set public read bucket policy
  aws s3api put-bucket-policy --bucket "$bucket" --policy "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Sid\":\"PublicReadGetObject\",
      \"Effect\":\"Allow\",
      \"Principal\":\"*\",
      \"Action\":\"s3:GetObject\",
      \"Resource\":\"arn:aws:s3:::$bucket/*\"
    }]
  }"

  echo "  ✓ Bucket configured"
}

# ── Deploy landing ────────────────────────────────────────────────────────────
echo ""
echo "1/3  Deploying landing page..."
create_bucket "$LANDING_BUCKET"
aws s3 sync "$ROOT_DIR/apps/landing/" "s3://$LANDING_BUCKET" \
  --delete \
  --cache-control "public, max-age=3600"
echo "  ✓ Landing deployed"

# ── Deploy docs ───────────────────────────────────────────────────────────────
echo ""
echo "2/3  Deploying docs..."
create_bucket "$DOCS_BUCKET"
aws s3 sync "$ROOT_DIR/apps/docs/" "s3://$DOCS_BUCKET" \
  --delete \
  --cache-control "public, max-age=3600"
echo "  ✓ Docs deployed"

# ── Build + deploy web app ────────────────────────────────────────────────────
echo ""
echo "3/3  Building and deploying web app..."
create_bucket "$APP_BUCKET"
cd "$ROOT_DIR/apps/web"
bun install --frozen-lockfile 2>/dev/null || bun install
bun run build
cd "$ROOT_DIR"

aws s3 sync "$ROOT_DIR/apps/web/dist/" "s3://$APP_BUCKET" \
  --delete \
  --cache-control "public, max-age=3600"

# HTML files: no cache (so users always get latest)
aws s3 cp "$ROOT_DIR/apps/web/dist/index.html" "s3://$APP_BUCKET/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "  ✓ Web app deployed"

# ── Print URLs ────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Frontend Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🏠 Landing:  http://$LANDING_BUCKET.s3-website-$REGION.amazonaws.com"
echo "  📚 Docs:     http://$DOCS_BUCKET.s3-website-$REGION.amazonaws.com"
echo "  🚀 Web App:  http://$APP_BUCKET.s3-website-$REGION.amazonaws.com"
echo ""
