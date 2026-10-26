import type { FilePathsForPublicFileList, FrontMatterDataStore } from 'yassb-web';

/** A page of the documentation, from the front matter of its Markdown file. */
export interface DocPage {
  title: string;
  description: string;
  section: string;
  sectionOrder: number;
  order: number;
  url: string;
  path: string;
}

/** Docs pages (generated from src/app/docs) in reading order: by section, then by page. */
export function docPages(files: Array<FilePathsForPublicFileList>, store: FrontMatterDataStore): Array<DocPage> {
  return files
    .filter(file => file.absolutePath.endsWith('.html') && store[file.absolutePath]?.title)
    .map(file => {
      const data = store[file.absolutePath];
      return {
        title: String(data.title),
        description: String(data.description || ''),
        section: String(data.section || 'Docs'),
        sectionOrder: Number(data.sectionOrder ?? 99),
        order: Number(data.order ?? 99),
        url: file.absoluteUrl,
        path: file.absolutePath
      };
    })
    .sort((a, b) => a.sectionOrder - b.sectionOrder || a.order - b.order || a.title.localeCompare(b.title));
}

/** Pages grouped by section, in order. */
export function sections(pages: Array<DocPage>): Array<{ title: string; pages: Array<DocPage> }> {
  const groups: Array<{ title: string; pages: Array<DocPage> }> = [];
  for (const page of pages) {
    let group = groups.find(item => item.title === page.section);
    if (!group)
      groups.push(group = { title: page.section, pages: [] });
    group.pages.push(page);
  }
  return groups;
}

export function esc(text: string): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
