#!/usr/bin/env node
/**
 * Install dsh-scope into a dsh profile: copy the package into the
 * profile's node_modules and append the bundle insert to the profile's
 * cordis.patch.yml (idempotent — safe to re-run).
 *
 * Usage: node scripts/install.mjs [profile]
 *   profile defaults to "web"
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(here, '..')
const profile = process.argv[2] ?? 'web'
const profileDir = join(homedir(), '.dsh', 'profiles', profile)
const patchPath = join(profileDir, 'cordis.patch.yml')
const target = join(profileDir, 'node_modules', 'dsh-scope')

const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'))

if (!existsSync(profileDir)) {
  console.error(`profile directory not found: ${profileDir}`)
  console.error(`create it first with: dsh plugin --profile ${profile} add <any-bundle>`)
  process.exit(1)
}

// 1. Copy lib/, cordis.patch.yml, package.json into the profile's node_modules.
rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
for (const entry of ['lib', 'cordis.patch.yml', 'package.json']) {
  const src = join(pkgRoot, entry)
  if (entry === 'lib') cpSync(src, join(target, entry), { recursive: true })
  else copyFileSync(src, join(target, entry))
}

// 2. Add the patch entry exactly once (comment-preserving).
const pluginLine = /^\s+name:\s*dsh-scope\s*$/gm
const patchBlock = `# dsh-scope: context visibility + usage heatmap
- insert:
    - id: dsh-scope
      name: dsh-scope
`
let patch = ''
try { patch = readFileSync(patchPath, 'utf8') } catch { /* first run */ }
const withoutEmptyRoot = patch.replace(/^\[\]\s*\n?/, '')
if ([...withoutEmptyRoot.matchAll(pluginLine)].length === 0) {
  const next = withoutEmptyRoot.trim() === ''
    ? patchBlock
    : `${withoutEmptyRoot.trimEnd()}\n\n${patchBlock}`
  writeFileSync(patchPath, next, 'utf8')
}

const count = [...readFileSync(patchPath, 'utf8').matchAll(pluginLine)].length
if (count !== 1) {
  console.error(`expected exactly one dsh-scope entry in ${patchPath}; found ${count}`)
  process.exit(1)
}

console.log(`Installed ${pkg.name}@${pkg.version}`)
console.log(`  package: ${target}`)
console.log(`  patch:   ${patchPath}`)
console.log(`Restart dsh (dsh --profile ${profile} or dsh web) to load the plugin.`)
