import { username } from './username.const';
import { YassbConfig } from '../bundle';
import { ExampleCustomDirective } from '../landing/src/app/yassb-plugins/custom-directives/example-custom-directive.class';
import { featuresList } from '../landing/src/app/yassb-plugins/custom-renderers/features-list';
import { guidesIndex } from '../landing/src/app/yassb-plugins/custom-renderers/guides-index';
import { guidesNavbarMenu } from '../landing/src/app/yassb-plugins/custom-renderers/guides-navbar-menu';
import { showOffCards } from '../landing/src/app/yassb-plugins/custom-renderers/show-off-cards';
import { addDivToPreCode } from '../landing/src/app/yassb-plugins/post-processors/add-div-to-pre-code.function';
import { buildTailwind } from '../landing/src/app/yassb-plugins/styles-parser/build-tailwind.function';

export default {
  username,
  workingDir: {
    base: 'landing',
    out: 'dist',
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
