#!/bin/bash
set -e

# Pull latest drafts from GitHub Actions
echo "Fetching latest drafts..."

RUN_ID=$(gh run list \
  --repo tblanx/squad \
  --workflow nightly.yml \
  --status success \
  --limit 1 \
  --json databaseId \
  --jq '.[0].databaseId')

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "No successful runs yet — using existing local drafts."
else
  mkdir -p intel
  gh run download "$RUN_ID" --repo tblanx/squad --name drafts --dir intel/ 2>/dev/null && \
    echo "Drafts updated from run $RUN_ID." || \
    echo "Already up to date."
fi

# Kill any existing server on port 3131
lsof -ti :3131 | xargs kill -9 2>/dev/null || true

# Open browser then start server
echo "Opening http://localhost:3131..."
open http://localhost:3131

cd "$(dirname "$0")/review" && npm start
