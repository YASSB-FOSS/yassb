import { YassbConfig } from 'yassb-web';
import { ExampleCustomDirective } from '../src/app/yassb-plugins/custom-directives/example-custom-directive.class';
import { featuresList } from '../src/app/yassb-plugins/custom-renderers/features-list';
import { guidesIndex } from '../src/app/yassb-plugins/custom-renderers/guides-index';
import { guidesNavbarMenu } from '../src/app/yassb-plugins/custom-renderers/guides-navbar-menu';
import { showOffCards } from '../src/app/yassb-plugins/custom-renderers/show-off-cards';
import { addDivToPreCode } from '../src/app/yassb-plugins/post-processors/add-div-to-pre-code.function';
import { buildTailwind } from '../src/app/yassb-plugins/styles-parser/build-tailwind.function';

export default {
  workingDir: {
    out: 'YASSB-FOSS.github.io',
    styles: 'styles/styles.css'
  },
  stylesParser: buildTailwind,
  customRenderers: {
    featuresList,
    guidesIndex,
    guidesNavbarMenu,
    showOffCards
  },
  customDirectives: [
    ExampleCustomDirective
  ],
  postProcessors: [addDivToPreCode],
  htmlMinificationOptions: {
    removeAttributeQuotes: false,
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true,
    conservativeCollapse: true,
    minifyCSS: true,
    minifyJS: true,
    removeComments: true
  }
} as YassbConfig
