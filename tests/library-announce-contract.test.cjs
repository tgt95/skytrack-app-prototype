const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ts = require('typescript')
require.extensions['.tsx'] = (module, filename) => {
  const fs = require('node:fs')
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: filename
  }).outputText
  module._compile(output, filename)
}
const LibraryAnnounceRegion = require('../src/modules/library/library-announce-region.tsx').default
const { templateSearchAnnouncement } = require('../src/modules/library/use-template-search.ts')

function jsxElements(sourcePath, name) {
  const source = ts.createSourceFile(sourcePath, fs.readFileSync(sourcePath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = []
  const visit = (node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === name) found.push(node.openingElement)
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === name) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function jsxStatusElements(sourcePath) {
  const source = ts.createSourceFile(sourcePath, fs.readFileSync(sourcePath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = []
  const visit = (node) => {
    const attributes = ts.isJsxElement(node)
      ? node.openingElement.attributes.properties
      : ts.isJsxSelfClosingElement(node)
        ? node.attributes.properties
        : []
    const isStatus = attributes.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'role' &&
      attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === 'status'
    )
    if (isStatus) found.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(entryPath)
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [entryPath] : []
  })
}

test('Library announce region retains status semantics and exposes current message', () => {
  const markup = renderToStaticMarkup(React.createElement(LibraryAnnounceRegion, {
    announce: 'Project has been created.'
  }))

  assert.match(markup, /role="status"/)
  assert.match(markup, /aria-live="polite"/)
  assert.match(markup, /data-testid="ms-lib-announce"/)
  assert.match(markup, /Project has been created\./)
})

test('Library route forwards its announce value into exactly one retained region', () => {
  const routePath = path.resolve(__dirname, '../src/modules/studio/studio-library-route.tsx')
  const libraryPath = path.resolve(__dirname, '../src/modules/library/library.tsx')
  const usages = jsxElements(routePath, 'StudioLibrary')
  assert.equal(usages.length, 1)
  assert.ok(usages[0].attributes.properties.some((attribute) =>
    ts.isJsxAttribute(attribute) && attribute.name.getText() === 'announce' &&
    ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression.getText() === 'announce'
  ))
  assert.equal(jsxElements(libraryPath, 'LibraryAnnounceRegion').length, 1)
  assert.equal(jsxElements(routePath, 'p').length, 0)
})

test('Library source has one status region and routes dynamic messages through its callback', () => {
  const libraryDirectory = path.resolve(__dirname, '../src/modules/library')
  const statusSources = sourceFiles(libraryDirectory).flatMap((sourcePath) =>
    jsxStatusElements(sourcePath).map(() => path.relative(libraryDirectory, sourcePath))
  )

  assert.deepEqual(statusSources, ['library-announce-region.tsx'])

  const librarySource = fs.readFileSync(path.join(libraryDirectory, 'library.tsx'), 'utf8')
  const templatesSource = fs.readFileSync(path.join(libraryDirectory, 'pages/templates-page.tsx'), 'utf8')
  const accountsSource = fs.readFileSync(path.join(libraryDirectory, 'account-menu-dialogs.tsx'), 'utf8')
  assert.match(librarySource, /onAnnounce\(\s*templateSearchAnnouncement\(filteredTemplates\.length,\s*searchTerm\),?\s*\)/)
  assert.match(templatesSource, /\{templates\.length\} result/)
  assert.match(accountsSource, /onAnnounce\(\s*(["'])Sign-in and account linking are not connected in this prototype\.\1,?\s*\)/)
})

test('template search announcement handles zero, one, and multiple results', () => {
  assert.equal(templateSearchAnnouncement(0, '  no match  '), '0 results for "no match".')
  assert.equal(templateSearchAnnouncement(1, 'inspection'), '1 result for "inspection".')
  assert.equal(templateSearchAnnouncement(3, 'inspection'), '3 results for "inspection".')
})
