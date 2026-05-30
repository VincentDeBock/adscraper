#!/bin/bash
# Run this once from the AdScraper folder to create the GitHub repo and push.
# Requires: git + GitHub CLI (gh). Install gh at https://cli.github.com if needed.

set -e

echo "Creating GitHub repo VincentDeBock/adscraper..."
gh repo create VincentDeBock/adscraper --public --description "Meta Ad Library Explorer" --source=. --remote=origin --push

echo ""
echo "Done! Repo is live at https://github.com/VincentDeBock/adscraper"
echo ""
echo "Next: connect it to Netlify at https://app.netlify.com and add META_ACCESS_TOKEN as an environment variable."
