/**
 * List of files to create in new projects as examples.
 * The key is the relative path from `base`.
 * The contents are added with `require` from the source files.
 */
export const FILES_TO_CREATE = {
  'src/app/components/head.html': require('./dummy-data/head.html'),
  'src/app/components/navbar.html': require('./dummy-data/navbar.html'),
  'src/app/components/footer.html': require('./dummy-data/footer.html'),
  'src/app/pages/index.html': require('./dummy-data/index.html'),
  'src/app/styles/styles.scss': require('./dummy-data/styles.scss'),
  'src/app/scripts/main.ts': require('./dummy-data/scripts.txt'),
  'package.json': require('./dummy-data/package.txt'),
  'config/default.ts': require('./dummy-data/default.txt')
};
