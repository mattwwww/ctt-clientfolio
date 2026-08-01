import { readFile, writeFile } from 'node:fs/promises';

const template = await readFile(new URL('./index.template.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
const bundle = await readFile(new URL('./app.bundle.js', import.meta.url), 'utf8');
const font = (await readFile(new URL('./assets/Deng.ttf', import.meta.url))).toString('base64');

const withInlineStyles = template.replace(
  /\s*<link rel="stylesheet" href="styles\.css" \/>/,
  () => `\n    <style>\n${styles}\n    </style>`
);

const standalone = withInlineStyles.replace(
  /\s*<script src="app\.bundle\.js(?:\?[^\"]+)?"><\/script>/,
  () => `\n    <script>\n      globalThis.__CLIENTFOLIO_FONT_DATA__ = '${font}';\n${bundle}\n    </script>`
);

if (standalone === template) throw new Error('Standalone template replacements did not match index.template.html');
await writeFile(new URL('./index.html', import.meta.url), standalone, 'utf8');
