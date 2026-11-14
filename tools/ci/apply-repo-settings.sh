#!/usr/bin/env bash
# Applies the repository settings and rulesets kept in this repo to GitHub.
# Run by a repository admin after the first push, and again whenever .github/rulesets changes:
#
#   tools/ci/apply-repo-settings.sh raincoat-ui/design-system
#
# Safe to re-run: settings are overwritten with the same values and rulesets are updated in place.
set -euo pipefail

repo="${1:?usage: apply-repo-settings.sh <owner>/<repo>}"
root="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Repository settings"
gh api --method PATCH "repos/$repo" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  -F web_commit_signoff_required=true \
  -F has_wiki=false \
  -F has_projects=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY \
  --silent

echo "Security features"
gh api --method PUT "repos/$repo/vulnerability-alerts" --silent
gh api --method PUT "repos/$repo/automated-security-fixes" --silent
gh api --method PUT "repos/$repo/private-vulnerability-reporting" --silent
gh api --method PATCH "repos/$repo" --silent --input - <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON

echo "Rulesets"
for file in "$root"/.github/rulesets/*.json; do
  name="$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).name)' "$file")"
  id="$(gh api "repos/$repo/rulesets" --jq ".[] | select(.name == \"$name\") | .id")"
  if [ -n "$id" ]; then
    gh api --method PUT "repos/$repo/rulesets/$id" --input "$file" --silent
    echo "  updated $name"
  else
    gh api --method POST "repos/$repo/rulesets" --input "$file" --silent
    echo "  created $name"
  fi
done

echo "Done. Verify under Settings > Rules > Rulesets, then try a direct push to main: it must be rejected."
