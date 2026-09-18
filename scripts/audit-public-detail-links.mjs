// Offline source audit: known navigation/API literals, templated paths and public
// assets against the root App Router. Data-provided URLs still require QA.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  });
}
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function routePattern(route) {
  return new RegExp('^' + route.split('/').map(segment => {
    if (/^\[\[\.\.\./.test(segment)) return '.*';
    if (/^\[\.\.\./.test(segment)) return '.+';
    if (/^\[/.test(segment)) return '[^/]+';
    return escape(segment);
  }).join('/') + '/?$');
}
export function auditRoutes(root = process.cwd()) {
  const app = path.join(root, 'src/app');
  const routes = files(app).filter(name => /\/(?:page|route)\.tsx?$/.test(name)).map(name => {
    const route = '/' + path.relative(app, path.dirname(name)).split(path.sep).filter(s => s && !s.startsWith('(') && !s.startsWith('@')).join('/');
    return { route, pattern: routePattern(route), kind: name.endsWith('page.tsx') ? 'page' : 'api' };
  });
  const retired = /^\/(?:discover|careers|member|organizations|employers|powwows|employer)(?:\/|$)/;
  const findings = [];
  let checked = 0;
  let dynamic = 0;
  for (const filename of files(path.join(root, 'src')).filter(name => /\.tsx?$/.test(name))) {
    const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      let value;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
      else if (ts.isTemplateExpression(node)) value = node.head.text + node.templateSpans.map(span => '__value__' + span.literal.text).join('');
      if (value !== undefined) {
        const parent = node.parent;
        const owner = ts.isJsxExpression(parent) ? parent.parent : parent;
        const field = (ts.isPropertyAssignment(owner) || ts.isJsxAttribute(owner)) && owner.name.getText(source);
        const call = ts.isCallExpression(parent) ? parent.expression.getText(source) : '';
        const isSiteUrl = /^https?:\/\/(?:www\.)?iopps\.ca(?:\/|$)/.test(value);
        const navigation = field === 'href' || (parent.arguments?.[0] === node && /^(?:fetch|redirect|permanentRedirect|router\.(?:push|replace))$/.test(call));
        if ((navigation || isSiteUrl) && /^(?:\/|https?:)/.test(value)) {
          const url = new URL(value, 'https://www.iopps.ca');
          if (['www.iopps.ca', 'iopps.ca'].includes(url.hostname)) {
            const pathname = url.pathname;
            if (pathname.includes('__value__')) dynamic++;
            checked++;
            // A computed suffix can be a query string, and a computed segment
            // can select a finite route family. Report these separately: this
            // check confirms a possible route, not every runtime value.
            const possible = new RegExp('^' + pathname.split('__value__').map(escape).join('.*') + '/?$');
            const exists = routes.some(route => route.pattern.test(pathname) ||
              (pathname.includes('__value__') && possible.test(route.route.replace(/\[.*?\]/g, '__value__')))) ||
              fs.existsSync(path.join(root, 'public', pathname));
            const reason = retired.test(pathname) && !pathname.startsWith('/api/') ? 'retired generated URL' : !exists ? 'no root route or asset' : null;
            if (reason) findings.push({ file: path.relative(root, filename), line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, url: value, reason });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { pages: routes.filter(r => r.kind === 'page').length, apiRoutes: routes.filter(r => r.kind === 'api').length, checked, templatedPaths: dynamic, findings };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditRoutes();
  console.log(JSON.stringify(result, null, 2));
  if (result.findings.length) process.exitCode = 1;
}
