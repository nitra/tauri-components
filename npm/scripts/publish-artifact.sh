#!/usr/bin/env bash
# Публікує файли оновлення в artifact (https://7n.ai/artifacts/<ARTIFACT_PROJECT>/) — публічно на 365 днів:
#   <Stem>_<v>_arm64.app.tar.gz(.sig) — архів оновлення tauri-plugin-updater
#   latest.json                            — endpoint updater: latest/latest.json (notes — зміни цієї версії)
#   changelog.json                         — уся історія з <APP_DIR>/CHANGELOG.md; застосунок показує з неї
#                                            зміни між поточною й новою версією (latest/changelog.json)
# DMG для встановлення — лише на сторінці релізів git.7n.ai (сторінка релізів репозиторію).
# Авторизація — Forgejo OIDC (audience artifact), job потребує enable-openid-connect: true.
set -euo pipefail

fail() {
  echo "publish-artifact: $*" >&2
  exit 1
}

[[ $# -eq 2 && $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "usage: ARTIFACT_PROJECT=<project> tauri-app-release publish <X.Y.Z> <assets-dir>"
version=$1
assets=$2
[[ -n ${ARTIFACT_PROJECT:-} ]] || fail "missing ARTIFACT_PROJECT"
project=$ARTIFACT_PROJECT
app_dir=${APP_DIR:-app}
product_name=$(node -p "require('./$app_dir/src-tauri/tauri.conf.json').productName")
file_stem=${product_name// /}
base_url=https://7n.ai/artifacts/$project

command -v artifact >/dev/null || fail "missing artifact CLI"

updater="${file_stem}_${version}_arm64.app.tar.gz"
for file in "$updater" "$updater.sig"; do
  [[ -s $assets/$file ]] || fail "missing $assets/$file"
done

# UUID версії відомий до публікації — latest.json посилається на незмінний URL архіву
artifact_version=$(artifact uuid)
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT

cp "$assets/$updater" "$assets/$updater.sig" "$staging/"

script_dir=$(cd "$(dirname "$0")" && pwd)
node "$script_dir/changelog.mjs" json > "$staging/changelog.json"
node "$script_dir/changelog.mjs" notes "$version" > "$staging/notes.md"

node - "$version" "$base_url/$artifact_version/$updater" "$staging/$updater.sig" "$staging/latest.json" "$staging/notes.md" <<'NODE'
const [version, url, signaturePath, output, notesPath] = process.argv.slice(2)
const fs = require('fs')
const signature = fs.readFileSync(signaturePath, 'utf8').trim()
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      version,
      notes: fs.readFileSync(notesPath, 'utf8').trim(),
      pub_date: new Date().toISOString(),
      platforms: { 'darwin-aarch64': { signature, url } }
    },
    null,
    2
  ) + '\n'
)
NODE

rm "$staging/notes.md"
artifact publish "$staging" --project "$project" --version "$artifact_version" --public --ttl 365 --force

for file in latest.json changelog.json "$updater"; do
  curl --fail --silent --show-error --location --output /dev/null "$base_url/latest/$file" ||
    fail "latest/$file is not reachable"
done

echo "artifact: $base_url/$artifact_version/"
echo "updater:  $base_url/latest/latest.json"
