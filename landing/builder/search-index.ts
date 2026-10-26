import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import type { BuildResult } from 'yassb-web';

/**
 * afterBuild hook: writes <out>/docs/search.json, the index of the ⌘K search of the docs (build and watch).
 */
export function buildSearchIndex(result: BuildResult): void {
  const docs = join(result.out, 'docs');
  if (!existsSync(docs))
    return;
  const entries = listHtml(docs).map(file => {
    const html = readFileSync(file, 'utf8');
    const article = /<article[^>]*>([\s\S]*?)<\/article>/.exec(html)?.[1] || '';
    const title = text(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(article)?.[1] || '');
    const section = /data-section="([^"]*)"/.exec(html)?.[1] || '';
    const headings = [...article.matchAll(/<h[23]\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h[23]>/g)].map(match => ({ id: match[1], title: text(match[2]) }));
    return {
      url: `/${relative(result.out, file).split('\\').join('/')}`,
      title,
      section,
      headings,
      text: text(article.replace(/<pre[\s\S]*?<\/pre>/g, ' ')).slice(0, 4000)
    };
  }).filter(entry => entry.title);
  writeFileSync(join(docs, 'search.json'), JSON.stringify(entries));
}

function listHtml(dir: string): Array<string> {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listHtml(path) : entry.endsWith('.html') ? [path] : [];
  });
}

function text(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#123;/g, '{').replace(/&#39;/g, '\'').replace(/\s+/g, ' ').trim();
}
