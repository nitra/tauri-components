#!/usr/bin/env node
// Реліз Tauri-застосунку (макет репозиторію як у nitra/client: app/, app/src-tauri, app/.changes):
//   tauri-app-release dmg <X.Y.Z>                      — підписаний і нотаризований DMG + архів оновлення
//   tauri-app-release publish <X.Y.Z> <assets-dir>     — файли оновлення в artifact (ARTIFACT_PROJECT)
//   tauri-app-release changelog json | notes <X.Y.Z>   — зріз app/CHANGELOG.md для CI
// Теку застосунку змінює APP_DIR (за замовчуванням app). Запускати з кореня репозиторію.
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const [command, ...args] = process.argv.slice(2)
const script = name => fileURLToPath(new URL(`../scripts/${name}`, import.meta.url))

const SCRIPTS = { dmg: 'release-dmg.sh', publish: 'publish-artifact.sh' }

if (command === 'changelog') {
  process.argv.splice(2, 1)
  await import('../scripts/changelog.mjs')
} else if (command in SCRIPTS) {
  const { status } = spawnSync('bash', [script(SCRIPTS[command]), ...args], { stdio: 'inherit' })
  process.exit(status ?? 1)
} else {
  process.stderr.write('usage: tauri-app-release dmg <X.Y.Z> | publish <X.Y.Z> <assets-dir> | changelog json|notes <X.Y.Z>\n')
  process.exit(2)
}
