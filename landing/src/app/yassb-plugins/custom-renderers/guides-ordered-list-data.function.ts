import { FilePathsForPublicFileList } from '../../../../../bundle';
import { FrontMatterDataStore } from '../../../../../bundle';

export interface GuidesOrderedListData {
  categories: any[];
  pagesByCategory: {
    [cat: string]: Array<GuideFrontMatterData>;
  };
}

export interface GuideFrontMatterData {
  title: string;
  order: number;
  slug: string;
  category: string;
  categoryOrder: number;
  absoluteUrl: string;
}

export function guidesOrderedListData(source: FilePathsForPublicFileList[], frontMatterStore: FrontMatterDataStore) {
  const pagesByCategory: GuidesOrderedListData['pagesByCategory'] = {};
  const categories = [];
  source.forEach(filePaths => {
    const data = frontMatterStore[filePaths.absolutePath] as unknown as GuideFrontMatterData;
    if (!data.category)
      return;
    if (!pagesByCategory[data.category])
      pagesByCategory[data.category] = [];
    if (!categories.includes(data.category))
      categories[data.categoryOrder] = data.category;
    data.absoluteUrl = filePaths.absoluteUrl;
    pagesByCategory[data.category].push(data);
  });
  return { categories, pagesByCategory };
}

