import { username } from './username.const';
import { YassbConfig } from '../bundle';

export default {
  username,
  workingDir: {
    base: 'test-project',
    src: 'src',
    out: 'public',
    styles: 'styles/styles.scss'
  },
  customRenderers: {},
  customDirectives: [],
  postProcessors: [],
  htmlMinificationOptions: {}
} as YassbConfig
