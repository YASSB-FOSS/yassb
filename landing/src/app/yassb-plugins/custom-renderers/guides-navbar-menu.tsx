import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { guidesOrderedListData } from './guides-ordered-list-data.function';
import { FilePathsForPublicFileList, Renderer, RendererProps } from '../../../../../bundle';

/**
 * Generates the guides menu to be displayed on mobile in the navbar.
 * Retrieves all contents and metadata for each file found ad given directory (and sub-dirs).
 * Sorts posts based on FrontMatter `order` value in ASC order.
 * Renders the html element to preview each blog post.
 */
export const guidesNavbarMenu: Renderer = ({ source, frontMatterStore }: RendererProps<Array<FilePathsForPublicFileList>>) => {
  const { categories, pagesByCategory } = guidesOrderedListData(source, frontMatterStore);
  let content = [];
  for (const cat of categories) {
    if (pagesByCategory[cat]) {
      const ulContent = [];
      pagesByCategory[cat].sort((a, b) => a.order - b.order);
      pagesByCategory[cat].forEach((grayMatterData, index) => {

        const attr = { href: grayMatterData.absoluteUrl };

        if (grayMatterData.slug)
          ulContent.unshift(
            <li key={index} className="flex items-center">
              <a className="lg:text-white lg:hover:text-gray-200 text-gray-800 text-xs px-3 py-2 lg:py-2 flex items-center uppercase font-bold" {...attr}>
                {grayMatterData.category}
              </a>
            </li>)

        if (pagesByCategory[cat].length === 1)
          return;

        ulContent.push(
          <li key={index} className="flex items-center pl-4">
            <a className="lg:text-white lg:hover:text-gray-300 text-gray-800 px-3 py-4 lg:py-2 flex items-center text-xs uppercase" {...attr}>
              {grayMatterData.title}
            </a>
          </li>
        );
      });
      content.push(<ul key={cat} className="flex flex-col lg:flex-row list-none lg:ml-auto">{ulContent}</ul>);
    }
  }
  return renderToStaticMarkup(
    <div>
      {...content}
    </div>
  );
}
