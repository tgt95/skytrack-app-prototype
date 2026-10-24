import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { cpSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
//
// Default (`vite build` / `vite dev`): multi-asset app, unchanged behavior.
// Singles mode (`npm run build:singles` -> scripts/build-singles.mjs):
//   SINGLES_ENTRY   = entry html under this folder, e.g. "singles/planner.html"
//   SINGLES_OUT_DIR = output dir, e.g. "dist/planner"
// Each build emits exactly one self-contained index.html (JS/CSS/fonts
// inlined, no public/ copy) so stakeholders can open it via file://.
const singlesEntry = process.env.SINGLES_ENTRY
const singlesOutDir = process.env.SINGLES_OUT_DIR

function cesiumPlugin(): Plugin {
  let resolvedBase = '/'
  let outDir = 'dist'

  function createCesiumMiddleware(): import('vite').Connect.NextHandleFunction {
    return (req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : ''
      const baseNorm = resolvedBase.endsWith('/') ? resolvedBase : resolvedBase + '/'
      const cesiumPrefix = baseNorm + 'cesium/'
      const altPrefix = '/cesium/'

      let relativePath: string | null = null
      if (url.startsWith(cesiumPrefix)) {
        relativePath = url.slice(cesiumPrefix.length)
      } else if (url.startsWith(altPrefix)) {
        relativePath = url.slice(altPrefix.length)
      }

      const cesiumRoot = existsSync(resolve(process.cwd(), outDir, 'cesium'))
        ? resolve(process.cwd(), outDir, 'cesium')
        : resolve(process.cwd(), 'node_modules/cesium/Build/Cesium')
      const fixtureRoot = resolve(process.cwd(), outDir, 'fixtures/3dtiles')

      function safeResolveInRoot(
        rootDir: string,
        rawRelPath: string
      ): { ok: true; path: string } | { ok: false; code: number } {
        if (!rawRelPath || rawRelPath.includes('\0')) return { ok: false, code: 400 }
        let decoded: string
        try {
          decoded = decodeURIComponent(rawRelPath)
        } catch {
          return { ok: false, code: 400 }
        }
        if (decoded.includes('\0')) return { ok: false, code: 400 }
        const fullPath = resolve(rootDir, decoded)
        const rootNorm = resolve(rootDir)
        if (!fullPath.startsWith(rootNorm + '/') && fullPath !== rootNorm) {
          return { ok: false, code: 403 }
        }
        return { ok: true, path: fullPath }
      }

      if (relativePath !== null) {
        const resPath = safeResolveInRoot(cesiumRoot, relativePath)
        if (!resPath.ok) {
          res.statusCode = resPath.code
          res.end('Access Denied')
          return
        }
        const filePath = resPath.path
        if (existsSync(filePath) && statSync(filePath).isFile()) {
          if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript')
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json')
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css')
          } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png')
          } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg')
          } else if (filePath.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm')
          } else if (filePath.endsWith('.b3dm') || filePath.endsWith('.glb')) {
            res.setHeader('Content-Type', 'model/gltf-binary')
          }
          res.end(readFileSync(filePath))
          return
        }
      }

      // Fixture serving
      const fixturePrefix = baseNorm + 'fixtures/3dtiles/'
      const altFixturePrefix = '/fixtures/3dtiles/'
      let fixtureRel: string | null = null
      if (url.startsWith(fixturePrefix)) {
        fixtureRel = url.slice(fixturePrefix.length)
      } else if (url.startsWith(altFixturePrefix)) {
        fixtureRel = url.slice(altFixturePrefix.length)
      }

      if (fixtureRel !== null) {
        const resPath = safeResolveInRoot(fixtureRoot, fixtureRel)
        if (!resPath.ok) {
          res.statusCode = resPath.code
          res.end('Access Denied')
          return
        }
        const fixturePath = resPath.path
        if (existsSync(fixturePath) && statSync(fixturePath).isFile()) {
          if (fixturePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json')
          else if (fixturePath.endsWith('.glb')) res.setHeader('Content-Type', 'model/gltf-binary')
          res.end(readFileSync(fixturePath))
          return
        }
      }

      next()
    }
  }
  return {
    name: 'vite-plugin-cesium-custom',
    configResolved(config) {
      resolvedBase = config.base || '/'
      outDir = config.build.outDir || 'dist'
    },
    configureServer(server) {
      server.middlewares.use(createCesiumMiddleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(createCesiumMiddleware())
    },
    closeBundle() {
      if (!singlesEntry) {
        const destCesium = resolve(process.cwd(), outDir, 'cesium')
        const srcCesium = resolve(process.cwd(), 'node_modules/cesium/Build/Cesium')
        const dirs = ['Assets', 'ThirdParty', 'Widgets', 'Workers']
        for (const dir of dirs) {
          const srcDir = resolve(srcCesium, dir)
          const targetDir = resolve(destCesium, dir)
          if (existsSync(srcDir)) {
            mkdirSync(targetDir, { recursive: true })
            cpSync(srcDir, targetDir, { recursive: true })
          }
        }
      }
    }
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    __SINGLES__: !!singlesEntry
  },
  resolve: {
    alias: {
      '@zip.js/zip.js/lib/zip-no-worker.js': '@zip.js/zip.js'
    }
  },
  // Mission Studio loads Cesium lazily. Include it up front so Vite does not
  // discover and re-optimize the large dependency after the app has loaded,
  // which can leave the scene requesting an outdated `cesium.js?v=...` URL.
  optimizeDeps: {
    include: ['cesium']
  },
  plugins: [react(), tailwindcss(), cesiumPlugin(), ...(singlesEntry ? [viteSingleFile()] : [])],
  build: singlesEntry
    ? {
        outDir: singlesOutDir ?? 'dist',
        emptyOutDir: true,
        copyPublicDir: false,
        assetsInlineLimit: 100000000,
        chunkSizeWarningLimit: 100000000,
        rollupOptions: {
          input: { index: resolve(process.cwd(), singlesEntry) }
        }
      }
    : {}
})
