import { defineConfig } from 'yassb-web';
import { featureList } from '../builder/renderers';

/**
 * YASSB configuration. Every option: `npx yassb docs configuration`.
 */
export default defineConfig({
  // Renderers turn JSON data into HTML; pages use them by name in `create-from-data-source`.
  customRenderers: { featureList },
  htmlMinificationOptions: {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true
  }
});
