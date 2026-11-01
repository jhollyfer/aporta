// Guarda do agente (`_standards/tooling.md` §6): recusa o comando git que
// apaga trabalho sem volta. `git push` comum e `--force-with-lease` passam.
import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8'))
const command = String(input?.tool_input?.command ?? '')

const blocked = [
  /\bgit\s+reset\s+(?:\S+\s+)*--hard\b/,
  /\bgit\s+clean\s+(?:\S+\s+)*-[a-zA-Z]*f/,
  /\bgit\s+branch\s+(?:\S+\s+)*-D\b/,
  /\bgit\s+checkout\s+(?:--\s+)?\.(?:\s|$)/,
  /\bgit\s+restore\s+(?:\S+\s+)*\.(?:\s|$)/,
  /\bgit\s+push\s+(?:\S+\s+)*(?:--force(?!-with-lease)\b|-f\b)/,
]

const hit = blocked.find((pattern) => pattern.test(command))
if (hit) {
  process.stderr.write(`git-guard: comando bloqueado pela régua (tooling.md §6): ${command}\n`)
  process.exit(2)
}
