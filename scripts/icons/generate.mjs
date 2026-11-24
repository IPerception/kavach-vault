// Generates the committed icon/image assets. Run: npm ci && node generate.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const packaging = path.join(root, 'kavach-backend', 'src', 'main', 'packaging')
const publicDir = path.join(root, 'kavach-frontend', 'public')
const svg = (name) => fs.readFileSync(path.join(here, name))

fs.mkdirSync(packaging, { recursive: true })

const render = (input, px) => sharp(input, { density: 384 }).resize(px, px).png().toBuffer()

// Small sizes use the simplified marks; larger ones use the app icon tile.
const markFor = (px) => (px <= 16 ? svg('mark-16.svg') : px <= 24 ? svg('mark-24.svg') : null)
const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icoPngs = []
for (const px of icoSizes) {
  const small = markFor(px)
  icoPngs.push(await render(small ?? svg('app-icon.svg'), px))
}
fs.writeFileSync(path.join(packaging, 'kavach.ico'), await pngToIco(icoPngs))
fs.writeFileSync(path.join(packaging, 'kavach.png'), await render(svg('app-icon.svg'), 256))

// Favicon fallback: the 32 px mark, no tile.
fs.writeFileSync(path.join(publicDir, 'favicon-32.png'), await render(svg('mark-32.svg'), 32))

// Setup wizard image: the illustrated poster, square, small enough to be cheap.
await sharp(path.join(publicDir, 'Kavach-Logo.png'))
  .resize(768, 768, { fit: 'cover' })
  .webp({ quality: 80, effort: 6 })
  .toFile(path.join(publicDir, 'kavach-setup.webp'))

console.log('icons generated')
