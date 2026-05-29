import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const gitDir = resolve(root, '.git')
const hooksDir = resolve(gitDir, 'hooks')
const commitMsgHook = resolve(hooksDir, 'commit-msg')

if (!existsSync(gitDir)) {
  console.log('Skip git hook install: .git directory not found.')
  process.exit(0)
}

mkdirSync(hooksDir, { recursive: true })

writeFileSync(
  commitMsgHook,
  [
    '#!/bin/sh',
    'bun run scripts/validate-commit-msg.ts "$1"',
    '',
  ].join('\n'),
  'utf8',
)

chmodSync(commitMsgHook, 0o755)
console.log('Installed commit-msg hook.')
