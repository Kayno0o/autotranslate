import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import { splitSubtitle } from './utils'

function splitTranslationFile(fir: string, filename: string) {
  console.log(chalk.cyan('\n[INFO]'), chalk.green('Splitting file:'), filename)

  const file = fs.readFileSync(path.resolve('output', fir, filename), 'utf-8')

  const parts = file.trim().split('\n\n').map(part => ({
    number: part.split('\n')[0],
    text: part.split('\n')
      .slice(2)
      .join('\n'),
    time: part.split('\n')[1],
  }))

  let output = ''
  for (const i in parts) {
    if (parts[i].text.split('\n').length >= 2)
      continue

    parts[i].text = parts[i].text.split('\n').map(splitSubtitle).join('\n')
  }

  for (const part of parts)
    output += `${part.number}\n${part.time}\n${part.text}\n\n`

  fs.writeFileSync(path.resolve('output', fir, filename), output)
}

const files = fs.readdirSync('output', { recursive: true })
// const files = fs.readdirSync('output')
for (const file of files) {
  if (typeof file !== 'string')
    continue

  if (file.endsWith('.fr.srt')) {
    splitTranslationFile(path.dirname(file), path.basename(file))
  }
}
