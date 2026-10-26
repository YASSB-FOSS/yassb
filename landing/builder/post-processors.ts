import hljs from 'highlight.js';
import { esc } from './docs';

/**
 * Post processor of every page: syntax highlighting, callouts, and the "On this page" navigation of docs pages.
 */
export function finalizePage(html: string): string {
  return tableOfContents(callouts(highlight(html)));
}

function decode(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&#123;/g, '{').replace(/&amp;/g, '&');
}

const ALIASES: { [name: string]: string } = { ts: 'typescript', js: 'javascript', sh: 'bash', shell: 'bash', html: 'xml', md: 'markdown', text: 'plaintext' };

/** `<pre><code class="language-x">` → highlight.js markup. Braces stay escaped so YASSB syntax is never executed. */
function highlight(html: string): string {
  return html.replace(/<pre>\s*<code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code>\s*<\/pre>/g, (_all, classes: string | undefined, code: string) => {
    const declared = (classes || '').split(/\s+/).map(name => name.replace(/^language-/, '')).find(Boolean) || 'plaintext';
    const language = ALIASES[declared] || declared;
    const source = decode(code).replace(/\n$/, '');
    let body = hljs.getLanguage(language) ? hljs.highlight(source, { language, ignoreIllegals: true }).value : esc(source);
    // YASSB directives are HTML comments: give them their own colour.
    body = body.replace(/<span class="hljs-comment">(&lt;!--\s*[a-z][\w-]*(?:=|\s*--&gt;)[\s\S]*?)<\/span>/g, '<span class="hljs-directive">$1</span>');
    return `<div class="code-block not-prose" data-language="${esc(declared)}"><button type="button" class="copy-code" aria-label="Copy code">Copy</button><pre><code class="hljs language-${esc(language)}">${body.replace(/\{/g, '&#123;')}</code></pre></div>`;
  });
}

const CALLOUTS: { [kind: string]: string } = {
  note: 'callout-note',
  tip: 'callout-note',
  agents: 'callout-agents',
  warning: 'callout-warning'
};

/** `> **Note** text` (also Tip, Warning, Agents) → a styled callout. */
function callouts(html: string): string {
  return html.replace(/<blockquote>\s*<p><strong>(Note|Tip|Warning|Agents)<\/strong>:?\s*([\s\S]*?)<\/blockquote>/g, (_all, kind: string, body: string) =>
    `<div class="callout ${CALLOUTS[kind.toLowerCase()]} not-prose"><p class="callout-title">${kind === 'Agents' ? 'For coding agents' : kind}</p><div class="callout-body prose prose-slate dark:prose-invert"><p>${body}</div></div>`);
}

/** Fills `<nav data-toc></nav>` with the h2/h3 of the article (only h2 on very long pages). */
function tableOfContents(html: string): string {
  if (!html.includes('<nav data-toc'))
    return html;
  const article = /<article[\s\S]*?<\/article>/.exec(html)?.[0] || '';
  const headings = [...article.matchAll(/<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)].map(match => ({
    level: Number(match[1]),
    id: match[2],
    text: match[3].replace(/<[^>]+>/g, '').trim()
  }));
  const list = headings.length > 30 ? headings.filter(heading => heading.level === 2) : headings;
  if (!list.length)
    return html.replace(/<nav data-toc[^>]*><\/nav>/, '');
  let items = '';
  let open = false;
  for (const heading of list) {
    const link = `<a href="#${heading.id}" data-toc-link class="hover:text-slate-600 dark:hover:text-slate-300">${heading.text}</a>`;
    if (heading.level === 2) {
      if (open)
        items += '</ol></li>';
      items += `<li><h3>${link}</h3><ol role="list" class="mt-2 space-y-3 pl-5 text-slate-500 dark:text-slate-400">`;
      open = true;
    } else
      items += `<li>${link}</li>`;
  }
  if (open)
    items += '</ol></li>';
  const toc = `<nav data-toc aria-labelledby="on-this-page-title" class="w-56"><h2 id="on-this-page-title" class="font-display text-sm font-medium text-slate-900 dark:text-white">On this page</h2><ol role="list" class="mt-4 space-y-3 text-sm">${items}</ol></nav>`;
  return html.replace(/<nav data-toc[^>]*><\/nav>/, toc);
}
