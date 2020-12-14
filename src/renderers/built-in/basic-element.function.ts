import { BasicElement, RendererProps } from '@yassb/yassb';
import createHtmlElement from 'create-html-element';

/**
 *
 *
 * Renders a HTML element for each element in source.
 *
 * The DOM element has the tag specified in the options under the key `name`, defaults to `span`.
 *
 * The content is the value of the property `description` on each object in `source`.
 *
 * If a lang is set, it looks for `description[lang]`.
 *
 * Any data passed in the `attributes` key in the options is set as the DOM element attribute.
 *
 *
 *
 * @param args the arguments passed as a deconstructable object.
 * @returns element HTML to be added to the page where the renderer has been invoked.
 */
export function basicElement({ lang, source, options = { name: 'span' } }: RendererProps<Array<BasicElement>>): string {
  let html = '';
  source.forEach(obj => {

    const config = {
      name: options['tag'],
      html: lang ? obj.description[lang] : obj.description
    };

    if (options['attributes'])
      config['attributes'] = options['attributes'];

    html += createHtmlElement(config);
  });
  return html;
}
