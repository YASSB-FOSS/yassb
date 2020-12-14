import { WORKING_DIR } from '@yassb/config/working-dir.constant';
import { resolve } from 'path';
import { Configuration } from 'webpack';
/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Defaults webpack config maker: receives the paths to the scripts entry file and the out folder and produces the final minified js dile
 *
 * @param file the path to the entry scripts file
 * @param path the out path
 * @param filename the filename of the final js minified file
 * @returns webpack configuration to be passed to webpack
 */
export function defaultWebpackConfigMaker(file: string, path: string, filename: string): Configuration {
  const configFile = resolve(WORKING_DIR.base, 'tsconfig.json');
  return {
    entry: {
      file
    },
    resolve: {
      extensions: ['.ts', 'tsx', '.js', 'jsx']
    },
    target: 'web',
    node: {
      __dirname: true
    },
    output: {
      path,
      filename
    },
    module: {
      rules: [
        {
          test: /\.tsx$/,
          loader: 'ts-loader',
          options: {
            configFile
          }
        },
        {
          test: /\.jsx$/,
          loader: 'ts-loader',
          options: {
            configFile
          }
        }
      ]
    },
    mode: 'production'
  };
}
