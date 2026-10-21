import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const libraryRoot = resolve(projectRoot, '../../components/skytrack-ui')
const libraryPackage = JSON.parse(readFileSync(join(libraryRoot, 'package.json'), 'utf8'))

if (libraryPackage.name !== 'skytrack-ui' || !libraryPackage.version) {
  throw new Error('Expected a versioned skytrack-ui package in designs/components/skytrack-ui.')
}

execFileSync('npm', ['run', 'pack:local'], { cwd: libraryRoot, stdio: 'inherit' })

const tarballName = `skytrack-ui-${libraryPackage.version}.tgz`
const sourceTarball = join(libraryRoot, 'dist-lib-tarball', tarballName)
const vendorRoot = join(projectRoot, 'vendor')
const targetTarball = join(vendorRoot, tarballName)

if (!existsSync(sourceTarball)) {
  throw new Error(`Local package build did not produce ${sourceTarball}`)
}

mkdirSync(vendorRoot, { recursive: true })
copyFileSync(sourceTarball, targetTarball)
console.log(`[update:skytrack-ui] Copied ${tarballName} into the prototype vendor folder.`)

execFileSync('npm', ['install', `file:vendor/${tarballName}`], {
  cwd: projectRoot,
  stdio: 'inherit'
})

console.log(`[update:skytrack-ui] Installed skytrack-ui ${libraryPackage.version} in the prototype.`)
