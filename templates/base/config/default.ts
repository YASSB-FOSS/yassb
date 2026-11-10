import { defineConfig } from 'yassb-web';
import { featureList } from '../builder/renderers';
import { styles } from '../builder/styles';

/**
 * YASSB configuration. Every option: `npx yassb docs configuration`.
 */
export default defineConfig({
  // How the stylesheet is compiled (Sass, Tailwind, plain CSS…) lives in builder/styles.ts.
  ...styles,
PRESET_OPTIONS
  // Renderers turn JSON data into HTML; pages use them by name in `create-from-data-source`.
  customRenderers: { featureList },
  htmlMinificationOptions: {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true
  }
});
