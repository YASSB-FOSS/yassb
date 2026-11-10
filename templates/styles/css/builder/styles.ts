import type { YassbConfig } from 'yassb-web';

/**
 * How the stylesheet is compiled: src/app/styles/styles.css, plain CSS. YASSB's built-in compiler reads it as
 * CSS and minifies it; nesting and custom properties pass through unchanged.
 */
export const styles: Partial<YassbConfig> = {
  workingDir: { styles: 'styles/styles.css' }
};
