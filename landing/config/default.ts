import type { YassbConfig } from 'yassb-web';
import { finalizePage } from '../builder/post-processors';
import { diagnosticsReference, docsNav, docsPager, featureCount, featureReference } from '../builder/renderers';
import { buildSearchIndex } from '../builder/search-index';
import { escapeBracesInCode } from '../builder/showdown';
import { tailwind } from '../builder/tailwind';

/**
 * Website of YASSB, built with YASSB. See AGENTS.md in this folder.
 */
export default {
  workingDir: {
    out: 'YASSB-FOSS.github.io',
    styles: 'styles/styles.css'
  },
  siteHost: 'https://yassb-foss.github.io/',
  cleanOut: true,
  stylesParser: tailwind,
  customRenderers: { docsNav, docsPager, featureReference, diagnosticsReference, featureCount },
  postProcessors: [finalizePage],
  showdownConverterOptions: {
    tables: true,
    ghCompatibleHeaderId: true,
    strikethrough: true,
    disableForced4SpacesIndentedSublists: true,
    extensions: [escapeBracesInCode]
  },
  htmlMinificationOptions: {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true
  },
  afterBuild: buildSearchIndex
} as YassbConfig;
