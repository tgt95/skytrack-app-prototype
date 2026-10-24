const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const budget = JSON.parse(fs.readFileSync(path.join(root, 'agents/file-size-baseline.json'), 'utf8'))

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function sourceFiles() {
  return walk(path.join(root, 'src'))
    .filter((file) => /\.(?:ts|tsx)$/.test(file) && !file.endsWith('.d.ts'))
    .map((file) => path.relative(root, file).split(path.sep).join('/'))
}

function extractModuleSpecifiers(filePath, sourceText) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
  const specifiers = []
  for (const statement of sourceFile.statements) {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier && ts.isStringLiteralLike(statement.moduleSpecifier)) {
      specifiers.push(statement.moduleSpecifier.text)
    }
  }
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
      if (isDynamicImport || isRequire) specifiers.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return specifiers
}

function resolveRelativeModule(filePath, specifier) {
  if (!specifier.startsWith('.')) return null
  return path.posix.normalize(path.posix.join(path.posix.dirname(filePath), specifier))
    .replace(/\.(?:ts|tsx|js|jsx|json)$/, '')
}

function dependencyViolations(filePath, sourceText) {
  const violations = []
  for (const specifier of extractModuleSpecifiers(filePath, sourceText)) {
    const localTarget = resolveRelativeModule(filePath, specifier)
    if (filePath.startsWith('src/domain/')) {
      if (!localTarget || !localTarget.startsWith('src/domain/')) {
        violations.push(`${filePath}: domain import "${specifier}" crosses the pure domain boundary`)
      }
    } else if (filePath.startsWith('src/shared/')) {
      const aliasedFeatureImport = /^(?:@\/|src\/)?modules\//.test(specifier)
      if (localTarget?.startsWith('src/modules/') || aliasedFeatureImport) {
        violations.push(`${filePath}: shared import "${specifier}" depends on a feature module`)
      }
    }
  }
  return violations
}

function collectDependencyViolations(files = sourceFiles()) {
  return files.flatMap((filePath) => {
    if (!filePath.startsWith('src/domain/') && !filePath.startsWith('src/shared/')) return []
    return dependencyViolations(filePath, fs.readFileSync(path.join(root, filePath), 'utf8'))
  })
}

function budgetCategory(filePath) {
  if (filePath.startsWith('src/modules/scene/')) return 'imperativeScene'
  if (filePath.startsWith('src/modules/library/database/')) return 'persistence'
  if (filePath.endsWith('.tsx')) return 'uiComponent'
  if (filePath.endsWith('.ts')) return 'domainAndHook'
  return null
}

function lineBudgetViolations(lineCounts, config = budget) {
  const exceptions = new Map(config.exceptions.map((entry) => [entry.path, entry]))
  const violations = []
  const knownPaths = new Set(Object.keys(lineCounts))
  for (const [filePath, lines] of Object.entries(lineCounts)) {
    const category = budgetCategory(filePath)
    if (!category) continue
    const target = config.targets[category]
    const exception = exceptions.get(filePath)
    if (lines <= target) {
      if (exception) violations.push(`${filePath}: stale size exception; remove it after reaching ${target} lines`)
      continue
    }
    if (!exception) {
      violations.push(`${filePath}: ${lines} lines exceeds ${category} target ${target}; add a reviewed baseline or reduce it`)
      continue
    }
    if (!exception.why || !Number.isInteger(exception.maxLines) || exception.maxLines < target) {
      violations.push(`${filePath}: size exception needs a rationale and a ceiling above ${target}`)
    } else if (lines > exception.maxLines) {
      violations.push(`${filePath}: ${lines} lines exceeds its reviewed ceiling ${exception.maxLines}`)
    }
  }
  for (const filePath of exceptions.keys()) {
    if (!knownPaths.has(filePath)) violations.push(`${filePath}: size exception references a missing source file`)
  }
  return violations
}

function collectLineCounts(files = sourceFiles()) {
  return Object.fromEntries(files.map((filePath) => {
    const text = fs.readFileSync(path.join(root, filePath), 'utf8')
    const count = text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0)
    return [filePath, count]
  }))
}

function checkRepository() {
  const files = sourceFiles()
  const violations = [
    ...collectDependencyViolations(files),
    ...lineBudgetViolations(collectLineCounts(files))
  ]
  return { files, violations }
}

if (require.main === module) {
  const { files, violations } = checkRepository()
  if (violations.length) {
    process.stderr.write(`${violations.join('\n')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(`Architecture and size guardrails PASS (${files.length} TypeScript sources checked).\n`)
  }
}

module.exports = {
  budgetCategory,
  checkRepository,
  collectDependencyViolations,
  dependencyViolations,
  extractModuleSpecifiers,
  lineBudgetViolations
}
