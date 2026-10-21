import { copyFile, mkdir } from 'node:fs/promises'

const distDirectory = new URL('../dist/', import.meta.url)
await mkdir(distDirectory, { recursive: true })
await copyFile(new URL('index.html', distDirectory), new URL('404.html', distDirectory))
