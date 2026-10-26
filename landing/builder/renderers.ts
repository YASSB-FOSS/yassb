import type { FilePathsForPublicFileList, RendererProps } from 'yassb-web';
import { docPages, esc, sections } from './docs';

/** Text shown in code: HTML-escaped, and braces escaped so that YASSB syntax in examples is not executed. */
export function codeText(text: string): string {
  return esc(text).replace(/\{/g, '&#123;');
}

/**
 * Sidebar of the docs (Syntax-style), from the generated pages and their front matter.
 * `<!-- public-file-list="docs" renderer="docsNav" -->` in the docs template (page level, so the current page is known).
 */
export function docsNav({ source, frontMatterStore, currentFilePath }: RendererProps<Array<FilePathsForPublicFileList>>): string {
  const groups = sections(docPages(source, frontMatterStore));
  const items = groups.map(group => `
    <li>
      <h2 class="font-display font-medium text-slate-900 dark:text-white">${esc(group.title)}</h2>
      <ul role="list" class="mt-2 space-y-2 border-l-2 border-slate-100 lg:mt-4 lg:space-y-4 lg:border-slate-200 dark:border-slate-800">
        ${group.pages.map(page => {
          const active = page.path === currentFilePath;
          const state = active
            ? 'font-semibold text-violet-500 before:bg-violet-500 dark:text-violet-400'
            : 'text-slate-500 before:hidden before:bg-slate-300 hover:text-slate-600 hover:before:block dark:text-slate-400 dark:before:bg-slate-700 dark:hover:text-slate-300';
          return `<li class="relative"><a href="${page.url}"${active ? ' aria-current="page"' : ''} class="block w-full pl-3.5 before:pointer-events-none before:absolute before:top-1/2 before:-left-1 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full ${state}">${esc(page.title)}</a></li>`;
        }).join('')}
      </ul>
    </li>`).join('');
  return `<nav class="text-base lg:text-sm"><ul role="list" class="space-y-9">${items}</ul></nav>`;
}

/** Previous / next links at the bottom of a docs page. */
export function docsPager({ source, frontMatterStore, currentFilePath }: RendererProps<Array<FilePathsForPublicFileList>>): string {
  const pages = docPages(source, frontMatterStore);
  const index = pages.findIndex(page => page.path === currentFilePath);
  const previous = index > 0 ? pages[index - 1] : undefined;
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined;
  const link = (page: typeof previous, label: string, align: 'left' | 'right') => !page ? '' : `
    <div class="${align === 'right' ? 'ml-auto text-right' : ''}">
      <dt class="font-display text-sm font-medium text-slate-900 dark:text-white">${label}</dt>
      <dd class="mt-1"><a href="${page.url}" class="flex items-center gap-x-1 text-base font-semibold text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 ${align === 'left' ? 'flex-row-reverse' : ''}">${esc(page.title)}<svg viewBox="0 0 16 16" aria-hidden="true" class="h-4 w-4 flex-none fill-current ${align === 'left' ? '-scale-x-100' : ''}"><path d="m9.182 13.423-1.17-1.16 3.505-3.505H3V7.065h8.517l-3.506-3.5L9.181 2.4l5.512 5.511-5.511 5.512Z"/></svg></a></dd>
    </div>`;
  return `<dl class="mt-12 flex border-t border-slate-200 pt-6 dark:border-slate-800">${link(previous, 'Previous', 'left')}${link(next, 'Next', 'right')}</dl>`;
}

interface Catalogue {
  version: string;
  features: Array<{
    id: string;
    kind: string;
    summary: string;
    usage: string;
    options: string;
    rules: string;
    errors: Array<string>;
    status: string;
    since: string;
    related: Array<string>;
    source: { file: string; line: number };
  }>;
  diagnostics: { [code: string]: string };
}

const KIND_TITLES: { [kind: string]: string } = {
  directive: 'Directives', renderer: 'Built-in renderers', config: 'Configuration', cli: 'Command line',
  i18n: 'Translations', content: 'Content', assets: 'Assets', api: 'Extension API', behaviour: 'Behaviour'
};

const anchor = (id: string) => `feature-${id.replace(/\./g, '-')}`;

/**
 * Every feature of the engine, rendered from docs/features.json (the catalogue the build of YASSB checks).
 * `<!-- create-from-data-source="../../../../docs/features.json" renderer="featureReference" -->`
 */
export function featureReference({ source }: RendererProps<Catalogue>): string {
  const kinds = Object.keys(KIND_TITLES).filter(kind => source.features.some(feature => feature.kind === kind));
  const toc = `<div class="not-prose my-8 flex flex-wrap gap-2">${kinds.map(kind => `<a href="#kind-${kind}" class="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-violet-100 hover:text-violet-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-violet-500/20 dark:hover:text-violet-300">${KIND_TITLES[kind]} <span class="text-slate-400">${source.features.filter(feature => feature.kind === kind).length}</span></a>`).join('')}</div>`;
  const body = kinds.map(kind => `
    <h2 id="kind-${kind}">${KIND_TITLES[kind]}</h2>
    ${source.features.filter(feature => feature.kind === kind).map(feature => `
      <h3 id="${anchor(feature.id)}"><code>${esc(feature.id)}</code></h3>
      <p class="not-prose -mt-3 mb-4 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span class="rounded-full px-2 py-0.5 ${feature.status === 'stable' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}">${esc(feature.status)}</span>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-400">since ${esc(feature.since)}</span>
      </p>
      <p>${esc(feature.summary)}</p>
      <pre><code class="language-${kind === 'cli' ? 'bash' : kind === 'config' || kind === 'api' ? 'typescript' : 'html'}">${codeText(feature.usage)}</code></pre>
      <dl class="feature-facts">
        <dt>Options</dt><dd>${codeText(feature.options)}</dd>
        <dt>Rules</dt><dd>${codeText(feature.rules)}</dd>
        ${feature.errors.length ? `<dt>Errors</dt><dd>${feature.errors.map(code => `<a href="/docs/reference/diagnostics.html#${code.toLowerCase()}"><code>${code}</code></a>`).join(' ')}</dd>` : ''}
        ${feature.related.length ? `<dt>Related</dt><dd>${feature.related.map(id => `<a href="#${anchor(id)}"><code>${esc(id)}</code></a>`).join(' ')}</dd>` : ''}
      </dl>`).join('')}`).join('');
  return `<p class="lead">${source.features.length} features in yassb-web ${esc(source.version)}. This page is rendered from the feature catalogue that the build of YASSB checks, so it always matches the code.</p>${toc}${body}`;
}

/** Table of every diagnostic code, with the features that report it. */
export function diagnosticsReference({ source }: RendererProps<Catalogue>): string {
  const rows = Object.entries(source.diagnostics).map(([code, description]) => {
    const features = source.features.filter(feature => feature.errors.includes(code));
    return `<tr id="${code.toLowerCase()}"><td><code>${code}</code></td><td>${codeText(description)}</td><td>${features.map(feature => `<a href="/docs/reference/features.html#${anchor(feature.id)}">${esc(feature.id)}</a>`).join(', ')}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Code</th><th>Meaning</th><th>Reported by</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** Number of features in the catalogue (home page). */
export function featureCount({ source }: RendererProps<Catalogue>): string {
  return String(source.features.length);
}
