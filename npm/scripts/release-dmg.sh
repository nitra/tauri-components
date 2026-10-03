#!/usr/bin/env bash
# Збірка підписаного й нотаризованого DMG і архіву оновлення (aarch64) для релізу — як у foc:
# підпис Developer ID з keychain Mac mini, без Infisical. Нотаризація — через профіль notarytool
# у keychain раннера (NOTARY_KEYCHAIN_PROFILE). Архів .app.tar.gz підписується ключем
# updater (TAURI_SIGNING_PRIVATE_KEY — Forgejo Actions secret репозиторію).
set -euo pipefail

usage() {
  echo "usage: tauri-app-release dmg <X.Y.Z>   (у корені репозиторію; APP_DIR — тека застосунку, за замовчуванням app)" >&2
}

fail() {
  echo "release-dmg: $*" >&2
  exit 1
}

if [[ $# -ne 1 || ! $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  usage
  exit 1
fi

version=$1
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

app_dir=${APP_DIR:-app}
# Назва застосунку — з tauri.conf.json: productName («Maya Release») і ім'я файлів без пробілів («MayaRelease»)
product_name=$(node -p "require('./$app_dir/src-tauri/tauri.conf.json').productName")
file_stem=${product_name// /}

[[ $(uname -s) == Darwin ]] || fail "release assets must be built on macOS"

for command in bun codesign security hdiutil shasum node rustup cargo xcrun spctl; do
  command -v "$command" >/dev/null || fail "missing required command: $command"
done

# Identity з keychain раннера (як у foc); сертифікат з оточення змусив би Tauri
# імпортувати його в тимчасовий keychain. Без APPLE_ID Tauri пропускає власну нотаризацію —
# її робимо нижче через notarytool-профіль.
unset APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD APPLE_ID APPLE_PASSWORD APPLE_API_KEY APPLE_API_ISSUER
export APPLE_SIGNING_IDENTITY=${APPLE_SIGNING_IDENTITY:-'Developer ID Application: N.itra ou (UHG6A28MTA)'}

notary_profile=${NOTARY_KEYCHAIN_PROFILE:-nitra-notary}
# Перевіряємо профіль до збірки — щоб не чекати її, аби впасти на нотаризації.
xcrun notarytool history --keychain-profile "$notary_profile" >/dev/null ||
  fail "notarytool keychain profile '$notary_profile' is missing; create it once on this Mac:
  xcrun notarytool store-credentials $notary_profile --apple-id <apple-id> --team-id UHG6A28MTA"

[[ -n ${TAURI_SIGNING_PRIVATE_KEY:-} ]] || fail "missing TAURI_SIGNING_PRIVATE_KEY (updater signing key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}

security find-identity -v -p codesigning | grep -Fq "\"$APPLE_SIGNING_IDENTITY\"" ||
  fail "signing identity $APPLE_SIGNING_IDENTITY is not installed in the keychain"

manifest_version=$(node -p "require('./$app_dir/package.json').version")
[[ $manifest_version == "$version" ]] ||
  fail "$app_dir/package.json has version $manifest_version, expected $version"

output_dir="dist/$file_stem-v$version"
[[ ! -e $output_dir ]] || fail "refusing to overwrite $output_dir"

rustup target add aarch64-apple-darwin
CI=true bun --cwd="$app_dir" run tauri build --target aarch64-apple-darwin --bundles app,dmg

bundle_root=target/aarch64-apple-darwin/release/bundle
dmg=$(find "$bundle_root/dmg" -maxdepth 1 -type f -name '*.dmg' -print -quit)
[[ -n $dmg ]] || fail "Tauri did not create a DMG in $bundle_root/dmg"

updater=$(find "$bundle_root/macos" -maxdepth 1 -type f -name '*.app.tar.gz' -print -quit)
[[ -n $updater ]] || fail "Tauri did not create an updater archive in $bundle_root/macos"
[[ -f "$updater.sig" ]] || fail "Tauri did not create an updater signature for $updater"

codesign --verify --deep --strict --verbose=2 "$bundle_root/macos/$product_name.app"
hdiutil verify "$dmg"

# Нотаризація DMG (разом із застосунком усередині) і вшивання тікета — Gatekeeper
# більше не блокує перший запуск завантаженого DMG.
# Завантаження в сховище Apple інколи обривається (abortedUpload) — до 3 спроб.
for attempt in 1 2 3; do
  if xcrun notarytool submit "$dmg" --keychain-profile "$notary_profile" --wait --timeout 30m; then
    break
  fi
  [[ $attempt -lt 3 ]] || fail "notarization failed after $attempt attempts"
  echo "release-dmg: notarization attempt $attempt failed, retrying in 30s" >&2
  sleep 30
done
xcrun stapler staple "$dmg"
xcrun stapler validate "$dmg"
spctl --assess --type open --context context:primary-signature --verbose=2 "$dmg"

mkdir -p "$output_dir"
cp "$dmg" "$output_dir/${file_stem}_${version}_arm64.dmg"
cp "$updater" "$output_dir/${file_stem}_${version}_arm64.app.tar.gz"
cp "$updater.sig" "$output_dir/${file_stem}_${version}_arm64.app.tar.gz.sig"

echo "release assets: $output_dir"
