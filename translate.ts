import fs from 'node:fs'
import path from 'node:path'
import ollama from 'ollama'
import chalk from 'chalk'
import progress from 'cli-progress'
import { logError } from './utils'

// ! regex replace `*text*` to `<i>text</i>` rules
// \*((?:[^*]|\n)+)\* -> <i>$1<\/i>

let lang = 'French'
let model = 'gemma2'

async function translateFile(dir: string, filename: string, { lang, model }: { lang: string, model: string }) {
  const outputDir = path.resolve('output', dir)
  const outputFilename = filename.replace(/(\.\w+)?\.srt$/, `.${lang}.srt`)
  const outputFilepath = path.resolve(outputDir, outputFilename)

  // if file exist, skip
  if (fs.existsSync(outputFilepath)) {
    // console.log(chalk.yellow('[WARN]'), 'File already exists, skipping...')
    return
  }

  console.log(chalk.cyan('\n[INFO]'), chalk.green('Translating file:'), filename)

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const file = fs.readFileSync(path.resolve('input', dir, filename), 'utf-8')

  const subtitleParts = file.trim().split('\n\n').map(part => ({
    number: part.split('\n')[0],
    text: part.split('\n')
      .slice(2)
      .join('\n'),
    time: part.split('\n')[1],
  }))

  let output = ''

  const backtrack = 0
  const stepAmount = 15

  const stepper = Math.min(stepAmount, subtitleParts.length)
  const length = subtitleParts.length

  const bar = new progress.SingleBar({
    barCompleteChar: '-',
    barIncompleteChar: ' ',
    format: `${chalk.cyan('[INFO]')} Progress ${chalk.bold('[{bar}]')} ${chalk.bold('{percentage}%')} | ETA: ${chalk.cyan('{eta_formatted}')} | {value}/${chalk.bold('{total}')} | {duration_formatted}`,
    hideCursor: true,
  }, progress.Presets.shades_classic)
  bar.start(length, 0)

  for (let i = 0; i < length; i += stepper) {
    const loadedParts = subtitleParts.slice(Math.max(0, i - backtrack), Math.min(i + stepper, length + 1))
    const text = loadedParts.map(part => part.text.replace(/\n(?!-)/g, ' ').replaceAll('</i> <i>', ' ')).join('\n\n')
    const prompt = `As a language expert, translate subtitles to ${lang}.
It is really important that you only translate the text and keep the formatting as it is.
Do not add any extra information and keep line breaks.
Keep <i> tags as they are, do not remove them.
Include credits if they are present in the text.

Text to translate:
${text}`

    const response = await ollama.chat({
      messages: [{
        content: prompt,
        role: 'user',
      }],
      model,
    })

    const content = response.message.content
      .trim()
      .replace(/<\s*i\s*>/g, '<i>')
      .replace(/<\s*\/\s*i\s*>/g, '</i>') // fix whitespace in <i> tags
      .replace(/<(?!i|\/i)([^<>]*)>(?!.*?<\/i.*?>)/g, '') // remove all tags except <i> and </i>

    // check for unclosed tags
    const openTags = content.matchAll(/<i>/g)
    const closeTags = content.matchAll(/<\/i>/g)
    if (openTags && closeTags && [...openTags].length !== [...closeTags].length) {
      logError('Tags are not closed, retrying...', prompt, content)
      i -= stepper
      continue
    }

    // split in parts
    const translations = content.split('\n\n')
    if (translations.length !== loadedParts.length) {
      logError('Translations do not match the expected amount, retrying...', prompt, content)
      i -= stepper
      continue
    }

    // check for backticks
    if (translations.join('').includes('`')) {
      logError('Translations contain backticks, retrying...', prompt, content)
      i -= stepper
      continue
    }

    // write the output
    const start = i === 0 ? 0 : backtrack
    for (let j = start; j < translations.length; ++j) {
      const part = subtitleParts[i + j - start]
      output += `${part.number}\n${part.time}\n${translations[j]}\n\n`
    }

    bar.update(i + stepper)
    fs.writeFileSync('tmp.srt', `${outputFilepath}\n\n-----------\n\n${output}`)
  }

  fs.writeFileSync(outputFilepath, output)
  bar.stop()
}

lang ??= process.argv[2]
model ??= process.argv[3]

const files = fs.readdirSync('input', { recursive: true })
for (const file of files) {
  if (typeof file !== 'string')
    continue

  if (file.endsWith('.srt')) {
    await translateFile(path.dirname(file), path.basename(file), { lang, model })
  }
}
