// CLI над app/CHANGELOG.md для релізного workflow:
//   tauri-app-release changelog json            — changelog.json (усі версії) у stdout
//   tauri-app-release changelog notes <X.Y.Z>   — markdown змін версії (опис релізу, notes у latest.json)
// Читає <APP_DIR>/CHANGELOG.md (APP_DIR за замовчуванням app) відносно поточної теки.
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { entryToMarkdown, parseChangelog } from '../src/app/changelog.js'

const changelogPath = `${process.env.APP_DIR ?? 'app'}/CHANGELOG.md`
const entries = parseChangelog(readFileSync(changelogPath, 'utf8'))
const [command, version] = process.argv.slice(2)

if (command === 'json') {
  process.stdout.write(`${JSON.stringify({ versions: entries }, null, 2)}\n`)
} else if (command === 'notes' && version) {
  const entry = entries.find(e => e.version === version)
  if (!entry) {
    process.stderr.write(`changelog: у ${changelogPath} немає секції [${version}]\n`)
    process.exit(1)
  }
  process.stdout.write(`${entryToMarkdown(entry)}\n`)
} else {
  process.stderr.write('usage: tauri-app-release changelog json | notes <X.Y.Z>\n')
  process.exit(2)
}
