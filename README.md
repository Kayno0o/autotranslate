# Auto-Translate

This project helps translating srt files, from the `./input` directory to the `./output` directory using a local Ollama instance.
I made it in a few hours, please be understanding about the quality of the project. 😁

## Installation/setup

```bash
bun install
```

Create the `./input` and `./output` directories.
Place all your `.srt` files in `./input`.

## Start translating

```bash
bun run translate.ts [language] [model]
```

### Default values

| Name       | Value  |
| ---------- | ------ |
| `language` | French |
| `model`    | gemma2 |
