#!/usr/bin/env node
// postinstall: install FontAwesome Pro icon packages if NPM_FONTAWESOME_TOKEN is
// set, otherwise leave them out and let vite.config.mjs alias to the free-icon
// fallback in src/fa-pro-fallback/. See README.md "FontAwesome Pro" section.
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Guard against re-entering this script from the `npm install` we spawn below
// (installing a package still runs the project's own postinstall script).
if (process.env.SOTLAS_FA_PRO_INSTALL_GUARD) {
  process.exit(0)
}

function proPackagesResolved () {
  try {
    require.resolve('@fortawesome/pro-regular-svg-icons/package.json')
    require.resolve('@fortawesome/pro-solid-svg-icons/package.json')
    return true
  } catch {
    return false
  }
}

if (proPackagesResolved()) {
  process.exit(0)
}

const token = process.env.NPM_FONTAWESOME_TOKEN

if (!token) {
  console.log('[fontawesome] NPM_FONTAWESOME_TOKEN not set — using free icon fallback (see README.md).')
  process.exit(0)
}

console.log('[fontawesome] NPM_FONTAWESOME_TOKEN detected — installing FontAwesome Pro icon packages...')

try {
  execFileSync('npm', [
    'install',
    '--no-save',
    '--no-package-lock',
    '--no-audit',
    '--no-fund',
    '--@fortawesome:registry=https://npm.fontawesome.com/',
    `--//npm.fontawesome.com/:_authToken=${token}`,
    '@fortawesome/pro-regular-svg-icons@^5.15.4',
    '@fortawesome/pro-solid-svg-icons@^5.15.4'
  ], {
    stdio: 'inherit',
    env: { ...process.env, SOTLAS_FA_PRO_INSTALL_GUARD: '1' }
  })
} catch {
  console.error('[fontawesome] NPM_FONTAWESOME_TOKEN is set but installing FontAwesome Pro packages failed. Fix the token/network issue, or unset NPM_FONTAWESOME_TOKEN to use the free icon fallback intentionally.')
  process.exit(1)
}

console.log('[fontawesome] FontAwesome Pro icon packages installed successfully.')
