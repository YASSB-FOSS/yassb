import { relative } from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { guidesOrderedListData } from './guides-ordered-list-data.function';
import { FilePathsForPublicFileList, Renderer, RendererProps } from '../../../../../bundle';

/**
 * Generates the guides side menu for `lg` screens.
 * Retrieves all contents and metadata for each file found ad given directory (and sub-dirs).
 * Sorts posts based on FrontMatter `order` value in ASC order.
 * Renders the html element to preview each blog post.
 */
export const guidesIndex: Renderer = ({ currentFilePath, source, config, frontMatterStore }: RendererProps<Array<FilePathsForPublicFileList>>) => {
  const { categories, pagesByCategory } = guidesOrderedListData(source, frontMatterStore);
  let content = [];
  const absoluteUrlOfCurrent = `/${relative(config.workingDir.out, currentFilePath).replace(/\\/g, '/')}`;
  for (const cat of categories) {
    if (pagesByCategory[cat]) {
      const ulContent = [];
      pagesByCategory[cat].sort((a, b) => a.order - b.order);
      pagesByCategory[cat].forEach((grayMatterData, index) => {

        const attr = absoluteUrlOfCurrent === grayMatterData['absoluteUrl'] ?
          { href: grayMatterData.absoluteUrl, className: 'text-pink-600 font-bold' } :
          { href: grayMatterData.absoluteUrl };

        if (grayMatterData.slug)
          ulContent.unshift(<h1 key={index} className="uppercase font-bold pt-4">{grayMatterData.category}</h1>)

        ulContent.push(<li key={index} className="py-1.5 pl-2"><a {...attr}>{grayMatterData.title}</a></li>);
      });
      content.push(<ul key={cat}>{ulContent}</ul>);
    }
  }
  return renderToStaticMarkup(
    <div>
      {...content}
    </div>
  );
}
