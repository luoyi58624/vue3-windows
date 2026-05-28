import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const outputPath = resolve(root, 'docs/changelog/index.md')

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

function formatChangelog(log: string) {
  const header = [
    '# 更新历史',
    '',
    '此页面由 `bun run changelog` 根据 git commit message 自动生成。',
    '',
  ]

  if (!log) {
    return [
      ...header,
      '> 当前目录没有可读取的 git 提交记录。发布到 GitHub 后，工作流会从仓库提交记录生成此页面。',
      '',
    ].join('\n')
  }

  const entries = log.split('\n').map((line) => {
    const [hash, date, ...messageParts] = line.split('\t')
    const message = messageParts.join('\t')
    return `- \`${hash}\` ${date} - ${message}`
  })

  return [...header, ...entries, ''].join('\n')
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, formatChangelog(runGitLog()), 'utf8')

if (!existsSync(outputPath)) {
  throw new Error(`Failed to write changelog: ${outputPath}`)
}
