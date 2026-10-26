import { readFileSync } from 'fs';
import { resolve } from 'path';
import { FilePathsForPublicFileList, RendererProps } from 'yassb-web';

interface News {
  title: { [lang: string]: string };
  date: string;
}

// Relies on __dirname being the folder of this file, as with ts-node in 1.x.
const LABELS = JSON.parse(readFileSync(resolve(__dirname, 'labels.json'), 'utf8'));

export function newsList({ source, lang, options }: RendererProps<Array<News>>): string {
  const limit = (options as { limit?: number } | undefined)?.limit ?? source.length;
  const items = source.slice(0, limit).map(item => `<li><time>${item.date}</time> <span>${item.title[lang]}</span></li>`).join('');
  return `<ul class="news" data-label="${LABELS.news}">${items}</ul><p data-t="NEWS.MORE">More news</p>`;
}

export function filesList({ source }: RendererProps<Array<FilePathsForPublicFileList>>): string {
  return '<ul class="files">' + source.map(file => `<li><a href="${file.absoluteUrl}">${file.absoluteUrl.split('/').pop()}</a></li>`).join('') + '</ul>';
}

export function peopleCards({ source, options }: RendererProps<Array<{ name: string; role: string }>>): string {
  const order = (options as { order?: Array<string> } | undefined)?.order;
  const people = order ? [...source].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)) : source;
  return people.map(person => `<article class="person"><h3>${person.name}</h3><p>${person.role} &amp; more</p></article>`).join('');
}
