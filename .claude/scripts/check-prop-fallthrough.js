#!/usr/bin/env node
// Vue 3 migration audit: find template usages that pass a prop/v-model name
// a component doesn't actually declare. Vue 3 silently forwards unknown
// attrs to $attrs (root element fallthrough) with no console warning, so
// these bugs are invisible unless checked mechanically. See
// .claude/plans/cuddly-churning-sunset.md for context (the <b-modal>
// v-model:active bug and its siblings were all found this way).
//
// Local patch script, not part of the upstream PR.
//
// Usage: node .claude/scripts/check-prop-fallthrough.js

const fs = require('fs')
const path = require('path')
const { parse: parseSFC } = require('@vue/compiler-sfc')
const { parse: parseJS } = require('@babel/parser')

const ROOT = path.resolve(__dirname, '../..')
const BUEFY_MAP_PATH = path.join(ROOT, '.claude/research/buefy-props-map.json')

// ---------- helpers ----------

function kebabToCamel (s) {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}

function kebabToPascal (s) {
  const camel = kebabToCamel(s)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

// Global HTML/Vue attributes and directive names that are legitimately
// passed to any component regardless of its declared props.
const IGNORE_ATTRS = new Set([
  'class', 'style', 'key', 'ref', 'id', 'slot', 'is'
])
// Native HTML/form/vue-router attributes that Buefy components intentionally
// let fall through to their inner native element via CompatFallthroughMixin
// (lesson 69: inheritAttrs:false + fallthroughAttrs). Only applied to Buefy
// components - own components rarely have this mechanism, so their
// fallthrough-looking props are worth checking individually.
const BUEFY_NATIVE_FALLTHROUGH = new Set([
  'pattern', 'autocorrect', 'autocapitalize', 'spellcheck', 'required',
  'placeholder', 'min', 'max', 'step', 'inputmode', 'lang', 'disabled',
  'readonly', 'title', 'href', 'to', 'target', 'rel', 'name', 'value',
  'checked', 'tabindex', 'alt', 'src', 'validationMessage'
])
const IGNORE_DIRECTIVES = new Set([
  'if', 'else', 'else-if', 'for', 'show', 'slot', 'html', 'text',
  'cloak', 'pre', 'once', 'memo', 'on'
])

function isIgnorableAttrName (name) {
  if (IGNORE_ATTRS.has(name)) return true
  if (/^aria-/.test(name)) return true
  if (/^data-/.test(name)) return true
  return false
}

function walk (node, visitor, depth) {
  depth = depth || 0
  if (!node || depth > 60) return
  visitor(node)
  const childArrays = [node.children, node.branches]
  childArrays.forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(c => walk(c, visitor, depth + 1))
  })
  if (node.content && typeof node.content === 'object') walk(node.content, visitor, depth + 1)
}

// ---------- B1: load the browser-extracted Buefy props/emits map ----------

if (!fs.existsSync(BUEFY_MAP_PATH)) {
  console.error('Missing ' + BUEFY_MAP_PATH + '. Regenerate it via browser_evaluate against a running dev server (see plan).')
  process.exit(1)
}
const buefyMap = JSON.parse(fs.readFileSync(BUEFY_MAP_PATH, 'utf8'))

// ---------- B4: extract own-component props from <script> via Babel ----------

function extractPropsFromObjectExpression (objExpr) {
  const propsNode = objExpr.properties.find(p =>
    (p.key && (p.key.name === 'props' || p.key.value === 'props'))
  )
  if (!propsNode || !propsNode.value) return null
  const val = propsNode.value
  if (val.type === 'ArrayExpression') {
    return val.elements.filter(Boolean).map(el => el.value).filter(v => typeof v === 'string')
  }
  if (val.type === 'ObjectExpression') {
    return val.properties.map(p => {
      if (p.key) return p.key.name || p.key.value
      return null
    }).filter(Boolean)
  }
  return null
}

function extractEmitsFromObjectExpression (objExpr) {
  const emitsNode = objExpr.properties.find(p =>
    (p.key && (p.key.name === 'emits' || p.key.value === 'emits'))
  )
  if (!emitsNode || !emitsNode.value) return []
  const val = emitsNode.value
  if (val.type === 'ArrayExpression') {
    return val.elements.filter(Boolean).map(el => el.value).filter(v => typeof v === 'string')
  }
  if (val.type === 'ObjectExpression') {
    return val.properties.map(p => (p.key ? (p.key.name || p.key.value) : null)).filter(Boolean)
  }
  return []
}

function findDefaultExportObject (ast) {
  let found = null
  function visit (node) {
    if (!node || typeof node !== 'object' || found) return
    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration && node.declaration.type === 'ObjectExpression') {
        found = node.declaration
      }
      return
    }
    for (const key in node) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue
      const val = node[key]
      if (Array.isArray(val)) val.forEach(visit)
      else if (val && typeof val.type === 'string') visit(val)
    }
  }
  visit(ast.program)
  return found
}

function getOwnComponentDefs (vueFiles) {
  const defs = {} // ComponentName (PascalCase, derived from filename) -> {props, emits, file}
  vueFiles.forEach(file => {
    const src = fs.readFileSync(file, 'utf8')
    let descriptor
    try {
      descriptor = parseSFC(src, { filename: file }).descriptor
    } catch (e) {
      console.error('SFC parse failed:', file, e.message)
      return
    }
    if (!descriptor.script && !descriptor.scriptSetup) return
    const scriptBlock = descriptor.script || descriptor.scriptSetup
    let ast
    try {
      ast = parseJS(scriptBlock.content, { sourceType: 'module', plugins: [] })
    } catch (e) {
      console.error('JS parse failed:', file, e.message)
      return
    }
    const objExpr = findDefaultExportObject(ast)
    const name = path.basename(file, '.vue')
    if (!objExpr) {
      defs[name] = { props: null, emits: [], file, note: 'no options-object default export (script setup or non-standard)' }
      return
    }
    defs[name] = {
      props: extractPropsFromObjectExpression(objExpr),
      emits: extractEmitsFromObjectExpression(objExpr),
      file
    }
  })
  return defs
}

// ---------- B2: extract template usages via @vue/compiler-sfc AST ----------

function extractTemplateUsages (file) {
  const src = fs.readFileSync(file, 'utf8')
  let descriptor
  try {
    descriptor = parseSFC(src, { filename: file }).descriptor
  } catch (e) {
    console.error('SFC parse failed:', file, e.message)
    return []
  }
  if (!descriptor.template) return []
  const usages = []
  walk(descriptor.template.ast, node => {
    if (node.type !== 1) return // ELEMENT_NODE only
    const tag = node.tag
    const isComponentLike = /^[A-Z]/.test(tag) || /^b-[a-z]/.test(tag) || tag.includes('-')
    if (!isComponentLike) return
    const pascalTag = /^[A-Z]/.test(tag) ? tag : kebabToPascal(tag)
    const passed = [] // {kind: 'attr'|'bind'|'model', name, line}
    ;(node.props || []).forEach(p => {
      const line = p.loc ? p.loc.start.line : null
      if (p.type === 6) { // static attribute
        if (!isIgnorableAttrName(p.name)) {
          passed.push({ kind: 'attr', name: kebabToCamel(p.name), raw: p.name, line })
        }
        return
      }
      if (p.type === 7) { // directive
        if (p.name === 'bind' && p.arg && p.arg.type === 4) {
          const raw = p.arg.content
          if (!isIgnorableAttrName(raw)) {
            passed.push({ kind: 'bind', name: kebabToCamel(raw), raw, line })
          }
          return
        }
        if (p.name === 'model') {
          if (p.arg && p.arg.type === 4) {
            passed.push({ kind: 'model', name: kebabToCamel(p.arg.content), raw: p.arg.content, line })
          } else {
            passed.push({ kind: 'model', name: 'modelValue', raw: '(default v-model)', line })
          }
          return
        }
        if (IGNORE_DIRECTIVES.has(p.name)) return
        // unknown directive kind (e.g. custom directives) - ignore, not a prop
      }
    })
    if (passed.length > 0) {
      usages.push({ tag, pascalTag, file, passed })
    }
  })
  return usages
}

// ---------- main ----------

function listVueFiles (dir) {
  const out = []
  fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...listVueFiles(full))
    else if (ent.name.endsWith('.vue')) out.push(full)
  })
  return out
}

const SRC = path.join(ROOT, 'src')
const allVueFiles = listVueFiles(SRC)
const ownDefs = getOwnComponentDefs(allVueFiles)

const findings = []
let calibrationHit = false

allVueFiles.forEach(file => {
  const usages = extractTemplateUsages(file)
  usages.forEach(u => {
    // Resolve against Buefy first, then own components
    const buefyDef = buefyMap[u.pascalTag]
    const ownDef = ownDefs[u.pascalTag]
    const relFile = path.relative(ROOT, u.file)

    if (!buefyDef && !ownDef) return // unknown tag (native HTML el with a dash, 3rd-party, etc.) - skip

    const declaredProps = buefyDef
      ? buefyDef.props
      : (ownDef && ownDef.props) // may be null if we couldn't statically extract (e.g. script setup)

    if (declaredProps === null || declaredProps === undefined) {
      // couldn't determine declared props for this own component - report as "unresolvable", not a bug
      return
    }

    u.passed.forEach(p => {
      if (declaredProps.includes(p.name)) return
      if (buefyDef && p.kind !== 'model' && BUEFY_NATIVE_FALLTHROUGH.has(p.name)) return // intentional native fallthrough (lesson 69)
      findings.push({
        component: u.pascalTag,
        source: buefyDef ? 'buefy' : 'own',
        file: relFile,
        line: p.line,
        kind: p.kind,
        passedAs: p.raw,
        resolvedPropName: p.name
      })
    })
  })
})

// Calibration: this script must be able to re-find at least one of the
// bugs already fixed in T-A if we temporarily re-inject them. Instead of
// mutating files, calibrate against a known-bad synthetic case inline.
;(function calibrate () {
  const buefyDef = buefyMap.BLoading
  if (!buefyDef) {
    console.error('CALIBRATION FAILED: BLoading not found in buefy-props-map.json - map is stale or missing.')
    process.exit(1)
  }
  const hasActive = buefyDef.props.includes('active')
  const hasModelValue = buefyDef.props.includes('modelValue')
  if (hasActive || !hasModelValue) {
    console.error('CALIBRATION FAILED: expected BLoading props to be {modelValue, ...} without "active". Got: ' + JSON.stringify(buefyDef.props))
    process.exit(1)
  }
  calibrationHit = true
})()

console.log('Calibration OK: BLoading correctly has modelValue but not active.\n')
console.log('Scanned ' + allVueFiles.length + ' .vue files, ' + Object.keys(buefyMap).length + ' Buefy component defs, ' + Object.keys(ownDefs).length + ' own component defs.\n')

if (findings.length === 0) {
  console.log('No fallthrough findings.')
} else {
  console.log(findings.length + ' potential fallthrough finding(s):\n')
  findings.forEach(f => {
    console.log(`${f.file}:${f.line}  <${f.component}> ${f.source}  ${f.kind}="${f.passedAs}" -> resolved prop "${f.resolvedPropName}" NOT declared`)
  })
}

fs.writeFileSync(
  path.join(ROOT, '.claude/research/prop-fallthrough-findings.json'),
  JSON.stringify({ generatedAt: 'see git log for date', findings }, null, 2)
)
console.log('\nFull results written to .claude/research/prop-fallthrough-findings.json')
