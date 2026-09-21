# AGENTS.md

Common development rules for this repository, read by any AI coding agent
(Claude Code, Codex, etc.). This file is the source of truth and is tracked
in this fork. If `.claude/AGENTS.md` exists in this checkout and you have not
already read it, read it too as a supplement for the maintainer's personal
workflow (plan storage, container operations, issue triage, etc.) — it does
not override or weaken anything below. A checkout without `.claude/` is
still complete on its own.

## Overview

[SOTA (Summits On The Air)](https://www.sota.org.uk/) map/database web
frontend, a fork of
[manuelkasper/sotlas-frontend](https://github.com/manuelkasper/sotlas-frontend).
Feature work and fixes are generally meant to become upstream pull requests.

## Tech stack

Treat this branch's own `package.json` as authoritative for the framework
version and what APIs are safe to use — do not infer it from the branch name
or from what another branch uses (branches named `vue2-*` have existed with
Vue 3 content underneath). Run `grep '"vue":' package.json` at the start of
work before proposing framework-specific code. If that check shows Vue 2.7
(EOL; `master` has been on Vue 3 since the 2026-09-18 upstream sync), do not
propose Vue 3-only APIs or assume Vue 3 semantics. Stack: Vue / Vite / Buefy
(Bulma) / `src/mapgl` (in-tree map components on the MapTiler SDK, which is
MapLibre-based).

## Setup and commands

- Install with `npm ci` (matches the committed lockfile). Use the Node
  version from `package.json` `engines`.
- FontAwesome Pro fallback: see `README.md`.
- Only use scripts that exist in `package.json` `scripts`. Do not invent a
  `npm test` or similar if there is no matching script — check
  `package.json` first, it takes precedence over any stale instructions in
  `README.md`.
- Typical commands: `npm run dev`, `npm run build`,
  `npm run lint -- --max-warnings 0`.

## Verification

- Run `npm run lint -- --max-warnings 0` before calling any change done, and
  treat zero warnings as the bar. Product code or build config changes: also
  build. UI changes: also check the affected screen/console/network.
- When a check was not run, say so explicitly (`not run`) with the reason,
  and keep that distinct from a check that ran and passed.

## Coding conventions

- Code comments are in English (upstream maintainers may read them). This
  applies to fork-specific files and local-patch comments too. Fix existing
  non-English comments opportunistically; no dedicated bulk-conversion task.

## Working across branches and worktrees

- At the start of work, check the current branch, outstanding diff, and
  existing worktrees before making changes. Do branch work in a separate
  worktree rather than switching the current one, so other in-progress work
  (including any nested private tooling checkout) isn't disturbed.
- Preserve existing uncommitted or unpushed work you find; don't discard it
  to make progress easier.

## Contributing upstream

- Before proposing an upstream PR, don't assume a fixed base — check which
  upstream branch is actually the target, what the real content diff is, and
  what depends on it. Exclude fork-specific operational files and local
  patches (see this repo's `.gitignore` and `.claude-container.d/` for
  examples) from upstream-bound commits.
- Commits intended for an upstream PR are written in English.
