import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Renderer, RendererProps } from '../../../../../bundle';

interface ShowOffCards {
  icon: string;
  title: string;
  content: string;
}

/**
 * Generates the cards displayed under the main header in the landing page.
 */
export const showOffCards: Renderer = ({ source, lang, options }: RendererProps<Array<ShowOffCards>>) => {
  const cards = []
  source.forEach((cardShow, index) => {
    cards.push(
      <div key={index} className="px-0 w-1/1 lg:w-1/2 mb-8 lg:mb-14 xl:mb-20 lg:px-8 xl:px-22 2xl:px-32">
        <div className="flex rounded-lg h-full bg-gray-100 p-8 flex-col shadow-lg">
          <div className="flex items-center mb-3">
            <div className="text-gray-100 p-3 text-center inline-flex items-center justify-center w-16 h-16 mb-6 shadow-lg rounded-full bg-pink-600">
              <i className={cardShow.icon}></i>
            </div>
            <h2 className="text-gray-900 text-2xl title-font font-medium -mt-6 ml-8">{cardShow.title}</h2>
          </div>
          <div className="flex-grow">
            <p className="p-4 text-xl font-normal leading-relaxed text-gray-500 text-justify">{cardShow.content}</p>
          </div>
        </div>
      </div>
    )
  });

  return renderToStaticMarkup(
    <div className="flex flex-wrap">
      {...cards}
    </div>
  );
}
