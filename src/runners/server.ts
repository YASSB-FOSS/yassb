import { LANGS } from '@yassb/i18n/langs.constant';
import { YassbConfig } from '@yassb/yassb';
import express from 'express';
import { relative } from 'path';
import { Server } from 'ws';

/**
 * Constant to store the connection to the browser in watch mode to exchange messages.
 * The connection is stored on a Object static contant of this module so that it can be easily accessed by the `watch` function without passing arguments.
 */
export const socketConnectionStore: { conn: WebSocket } = {
  conn: undefined
};

/**
 * Dev server for watch mode. Do not use as it is in production!
 *
 * @param config used to determine the out folder.
 * @param watcher the fucntion that actually watches for changes and invokes the build process.
 */
export function devServer(config: YassbConfig, watcher: () => void): void {

  const nameOfOutFolder = relative(process.cwd(), config.workingDir.out);
  const app = express();

  if (LANGS.length) {
    LANGS.forEach(lang => {
      app.use(`/${lang}`, express.static(`${nameOfOutFolder}/${lang}`));
    });
    app.use('/', express.static(`${nameOfOutFolder}/${LANGS[0]}`));
    app.use('/index.html', express.static(`${nameOfOutFolder}/${LANGS[0]}`));
  }

  app.use(express.static(nameOfOutFolder));
  // not found in static files, so default to index.html
  if (LANGS.length)
    app.use((req, res) => res.sendFile(`${config.workingDir.out}/${LANGS[0]}/index.html`));
  else
    app.use((req, res) => res.sendFile(`${config.workingDir.out}/index.html`));

  const port = config.devServerPort || 3000;

  // For live reloading
  const ws = new Server({ port: 3001 });
  ws.on('connection', (conn: WebSocket) => {
    console.log('Live reload connected to client');
    socketConnectionStore.conn = conn;
  });

  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}\n`);
    watcher();
  });

}
