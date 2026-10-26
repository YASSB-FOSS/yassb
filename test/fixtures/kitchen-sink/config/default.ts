import { YassbConfig } from 'yassb-web';
import { PageStampDirective, ShoutDirective } from '../builder/directives';
import { filesList, newsList, peopleCards } from '../builder/renderers';
import { markProcessed } from '../builder/post-processors';

export default {
  username: 'tester',
  customRenderers: { newsList, filesList, peopleCards },
  customDirectives: [ShoutDirective, PageStampDirective],
  postProcessors: [markProcessed],
  htmlMinificationOptions: {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true
  }
} as YassbConfig;
