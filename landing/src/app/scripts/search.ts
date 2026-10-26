/** ⌘K search over /docs/search.json (written by the afterBuild hook of the site). */
interface SearchEntry {
  url: string;
  title: string;
  section: string;
  headings: Array<{ id: string; title: string }>;
  text: string;
}

interface Result {
  url: string;
  title: string;
  context: string;
  score: number;
}

let index: Promise<Array<SearchEntry>> | undefined;

function loadIndex(): Promise<Array<SearchEntry>> {
  index = index || fetch('/docs/search.json').then(response => response.ok ? response.json() : []).catch(() => []);
  return index;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mark(text: string, words: Array<string>): string {
  let html = escapeHtml(text);
  for (const word of words)
    if (word.length > 1)
      html = html.replace(new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark class="bg-transparent text-violet-600 underline dark:text-violet-400">$1</mark>');
  return html;
}

function search(entries: Array<SearchEntry>, query: string): Array<Result> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length)
    return [];
  const results: Array<Result> = [];
  for (const entry of entries) {
    const title = entry.title.toLowerCase();
    const body = entry.text.toLowerCase();
    if (words.every(word => title.includes(word)))
      results.push({ url: entry.url, title: entry.title, context: entry.section, score: 100 });
    for (const heading of entry.headings)
      if (words.every(word => heading.title.toLowerCase().includes(word)))
        results.push({ url: `${entry.url}#${heading.id}`, title: heading.title, context: `${entry.section} / ${entry.title}`, score: 50 });
    if (words.every(word => body.includes(word)) && !results.some(result => result.url === entry.url)) {
      const at = body.indexOf(words[0]);
      results.push({ url: entry.url, title: entry.title, context: `…${entry.text.slice(Math.max(0, at - 40), at + 80)}…`, score: 10 });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}

export function setupSearch(): void {
  const dialog = document.querySelector<HTMLElement>('[data-search-dialog]');
  const input = document.querySelector<HTMLInputElement>('[data-search-input]');
  const list = document.querySelector<HTMLElement>('[data-search-results]');
  if (!dialog || !input || !list)
    return;
  let active = 0;

  const open = () => {
    dialog.hidden = false;
    input.value = '';
    list.innerHTML = '';
    requestAnimationFrame(() => input.focus());
    void loadIndex();
  };
  const close = () => {
    dialog.hidden = true;
  };
  const highlightActive = () => list.querySelectorAll('a').forEach((link, i) => link.toggleAttribute('data-active', i === active));

  document.querySelectorAll('[data-search-open]').forEach(button => button.addEventListener('click', open));
  dialog.querySelectorAll('[data-search-close]').forEach(element => element.addEventListener('click', close));
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.hidden)
        open();
      else
        close();
    } else if (event.key === 'Escape' && !dialog.hidden)
      close();
  });

  input.addEventListener('input', async () => {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    const results = search(await loadIndex(), input.value);
    active = 0;
    list.innerHTML = input.value && !results.length
      ? `<p class="px-4 py-6 text-center text-sm text-slate-500">Nothing found for “${escapeHtml(input.value)}”.</p>`
      : results.map(result => `<a href="${result.url}" class="block rounded-lg px-3 py-2 data-active:bg-slate-100 dark:data-active:bg-slate-700/30"><div class="text-sm text-slate-700 dark:text-slate-300">${mark(result.title, words)}</div><div class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">${mark(result.context, words)}</div></a>`).join('');
    highlightActive();
  });

  input.addEventListener('keydown', event => {
    const links = list.querySelectorAll<HTMLAnchorElement>('a');
    if (!links.length)
      return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      active = (active + (event.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length;
      highlightActive();
      links[active].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      links[active].click();
    }
  });
}
