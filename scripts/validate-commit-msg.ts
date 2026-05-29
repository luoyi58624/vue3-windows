import { readFileSync } from 'node:fs'

const messageFile = process.argv[2]

if (!messageFile) {
  console.error('Missing commit message file path.')
  process.exit(1)
}

const message = readFileSync(messageFile, 'utf8').split(/\r?\n/)[0]?.trim() ?? ''
const allowedTypes = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
]
const commitPattern = new RegExp(`^(${allowedTypes.join('|')})(\\([^)]+\\))?!?: .+`)

if (commitPattern.test(message)) {
  process.exit(0)
}

console.error([
  'Invalid commit message.',
  '',
  'Commit message must follow Conventional Commits:',
  '  <type>[optional scope]: <description>',
  '',
  'Allowed types:',
  `  ${allowedTypes.join(', ')}`,
  '',
  'Examples:',
  '  feat: add window manager demo',
  '  fix(window): restore dock ordering',
  '  docs: update usage guide',
].join('\n'))

process.exit(1)
