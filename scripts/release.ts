import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

type BumpType = 'major' | 'minor' | 'patch'

type PackageJson = {
  name?: string
  version?: string
  [key: string]: unknown
}

const root = resolve(import.meta.dir, '..')
const packagePath = resolve(root, 'package.json')
const changelogPath = resolve(root, 'docs/changelog/index.md')
const changelogTypes = ['feat', 'fix', 'docs', 'refactor', 'perf', 'revert']
const changelogPattern = new RegExp(`^(${changelogTypes.join('|')})(\\([^)]+\\))?!?: .+`)
const args = Bun.argv.slice(2)
const dryRun = args.includes('--dry-run')
const shouldPush = args.includes('--push')
const allowBranch = args.includes('--allow-branch')
const bumpArg = args.find((arg) => !arg.startsWith('--'))

const branch = git(['branch', '--show-current']).trim()
if (branch !== 'main' && !allowBranch) {
  fail(`Release must run on main. Current branch: ${branch || '(detached)'}`)
}

const status = git(['status', '--porcelain']).trim()
if (status && !dryRun) {
  fail(`Working tree must be clean before release.\n${status}`)
}
if (status && dryRun) {
  log(`Dry run allows dirty working tree:\n${status}`)
}

const packageJson = readPackageJson()
const currentVersion = parseVersion(packageJson.version ?? '')
const bump = resolveBump(bumpArg)
const nextVersion = resolveNextVersion(bump, currentVersion)
const tagName = `v${nextVersion}`

if (git(['tag', '--list', tagName]).trim()) {
  fail(`Tag already exists: ${tagName}`)
}

log(`Release ${packageJson.name ?? 'package'} ${packageJson.version} -> ${nextVersion}`)
if (isBumpType(bump)) {
  log(`Bump: ${bump}`)
}
log(`Tag: ${tagName}`)

if (dryRun) {
  log('Dry run completed. No files were changed.')
  process.exit(0)
}

packageJson.version = nextVersion
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')

writeChangelog()
run(['git', 'add', 'package.json', 'docs/changelog/index.md'])
run(['git', 'commit', '-m', `chore(release): ${tagName}`])
run(['git', 'tag', '-a', tagName, '-m', tagName])

if (shouldPush) {
  run(['git', 'push', 'origin', branch])
  run(['git', 'push', 'origin', tagName])
} else {
  log(`Created release commit and tag locally. Push with: git push origin ${branch} ${tagName}`)
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson
}

function writeChangelog() {
  mkdirSync(dirname(changelogPath), { recursive: true })
  writeFileSync(changelogPath, formatChangelog(runGitLog()), 'utf8')
}

function runGitLog() {
  const result = Bun.spawnSync({
    cmd: ['git', 'log', '--pretty=format:%h%x09%ad%x09%s', '--date=short'],
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (result.exitCode !== 0) {
    return ''
  }

  return result.stdout.toString().trim()
}

function formatChangelog(logOutput: string) {
  const header = [
    '# 更新历史',
    '',
    '此页面由 `bun run release` 在发布时根据 git commit message 自动生成。',
    '',
  ]

  if (!logOutput) {
    return [
      ...header,
      '> 当前目录没有可读取的 git 提交记录。',
      '',
    ].join('\n')
  }

  const entries = logOutput
    .split('\n')
    .filter((line) => {
      const [, , ...messageParts] = line.split('\t')
      const message = messageParts.join('\t')
      return changelogPattern.test(message)
    })
    .map((line) => {
      const [hash, date, ...messageParts] = line.split('\t')
      const message = messageParts.join('\t')
      return `- \`${hash}\` ${date} - ${message}`
    })

  if (entries.length === 0) {
    return [
      ...header,
      '> 当前提交记录中没有符合更新历史展示规则的日志。',
      '',
    ].join('\n')
  }

  return [...header, ...entries, ''].join('\n')
}

function resolveBump(input: string | undefined) {
  if (!input || input === 'auto') {
    return inferBumpFromCommits()
  }

  return input
}

function resolveNextVersion(input: string, current: [number, number, number]) {
  if (isBumpType(input)) {
    return bumpVersion(current, input)
  }

  parseVersion(input)
  return input
}

function inferBumpFromCommits(): BumpType {
  const latestTag = tryGit(['describe', '--tags', '--abbrev=0']).trim()
  const range = latestTag ? `${latestTag}..HEAD` : 'HEAD'
  const logOutput = git(['log', range, '--pretty=format:%s%x1f%b%x1e']).trim()
  if (!logOutput) {
    fail(`No commits found for release range: ${range}`)
  }

  let hasFix = false
  let hasFeat = false
  let hasBreaking = false

  for (const rawEntry of logOutput.split('\x1e')) {
    const entry = rawEntry.trim()
    if (!entry) {
      continue
    }

    const [subject = '', body = ''] = entry.split('\x1f')
    if (isBreakingCommit(subject, body)) {
      hasBreaking = true
      continue
    }

    if (/^feat(?:\([^)]+\))?: .+/.test(subject)) {
      hasFeat = true
      continue
    }

    if (/^fix(?:\([^)]+\))?: .+/.test(subject)) {
      hasFix = true
    }
  }

  if (hasBreaking) {
    log(`Auto bump source: ${range} contains breaking change.`)
    return 'major'
  }

  if (hasFeat) {
    log(`Auto bump source: ${range} contains feat commit.`)
    return 'minor'
  }

  if (hasFix) {
    log(`Auto bump source: ${range} contains fix commit.`)
    return 'patch'
  }

  fail(`No release commit found in ${range}. Expected fix:, feat:, or feat!:`)
}

function isBreakingCommit(subject: string, body: string) {
  return (
    /^[a-z]+(?:\([^)]+\))?!: .+/.test(subject)
    || /(^|\n)BREAKING CHANGE: .+/.test(body)
    || /(^|\n)BREAKING-CHANGE: .+/.test(body)
  )
}

function bumpVersion([major, minor, patch]: [number, number, number], bump: BumpType) {
  if (bump === 'major') {
    return `${major + 1}.0.0`
  }

  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`
  }

  return `${major}.${minor}.${patch + 1}`
}

function parseVersion(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    fail(`Invalid semver version: ${version}`)
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isBumpType(input: string): input is BumpType {
  return input === 'major' || input === 'minor' || input === 'patch'
}

function git(args: string[]) {
  const result = Bun.spawnSync({
    cmd: ['git', ...args],
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (result.exitCode !== 0) {
    fail(result.stderr.toString().trim() || `git ${args.join(' ')} failed`)
  }

  return result.stdout.toString()
}

function tryGit(args: string[]) {
  const result = Bun.spawnSync({
    cmd: ['git', ...args],
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (result.exitCode !== 0) {
    return ''
  }

  return result.stdout.toString()
}

function run(cmd: string[]) {
  log(cmd.join(' '))
  const result = Bun.spawnSync({
    cmd,
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    fail(`${cmd.join(' ')} failed`)
  }
}

function log(message: string) {
  console.log(message)
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}
