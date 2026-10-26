import { RendererProps } from 'yassb-web';

/** One record of src/app/data-sources/features.json. */
interface Feature {
  title: string;
  description: string;
}

/** Escapes text inserted into HTML. */
function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * `<!-- create-from-data-source="features.json" renderer="featureList" options="{"limit":3}" -->`
 */
export function featureList({ source, options }: RendererProps<Array<Feature>, { limit?: number }>): string {
  const items = source.slice(0, options?.limit ?? source.length);
  return items.map(item => `<li><strong>${esc(item.title)}</strong> ${esc(item.description)}</li>`).join('');
}
