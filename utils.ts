import fs from 'node:fs'
import chalk from 'chalk'

export function splitSubtitle(line: string): string {
  const maxLength = 50

  if (line.length <= maxLength) {
    return line
  }

  const breakPoint = Math.floor(line.length / 2)

  // Find the nearest space to the breakPoint, preferring spaces before the breakPoint
  let left = breakPoint

  while (left > 0 && line[left] !== ' ') {
    left--
  }

  // If no space is found, fall back to splitting at the original breakPoint
  if (left === 0) {
    left = breakPoint
  }

  const firstPart = line.slice(0, left).trim()
  const secondPart = line.slice(left).trim()

  return `${firstPart}\n${secondPart}`
}

export function logError(msg: string, prompt?: string, content?: string) {
  console.log(chalk.red('\n[ERROR]'), msg)

  if (prompt && content)
    fs.writeFileSync('error.log', `-----------\n\n${prompt}\n\n\n\n${content}\n\n-----------`)
}
