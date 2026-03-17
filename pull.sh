#!/bin/bash
set -e

echo "Fetching latest nightly run..."

RUN_ID=$(gh run list \
  --repo tblanx/squad \
  --workflow nightly.yml \
  --status success \
  --limit 1 \
  --json databaseId \
  --jq '.[0].databaseId')

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "No successful runs found yet. Has the nightly workflow run at least once?"
  exit 1
fi

echo "Downloading drafts from run $RUN_ID..."
mkdir -p intel
gh run download "$RUN_ID" --repo tblanx/squad --name drafts --dir intel/

echo ""
echo "Done. Start the review server:"
echo "  cd review && npm start"
echo "Then open: http://localhost:3131"
