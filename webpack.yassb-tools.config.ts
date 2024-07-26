import { readJSONSync } from 'fs-extra';
import { join } from 'path';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import * as webpack from 'webpack';

const packageConfig = readJSONSync('./package.json', { encoding: 'utf-8' });

const externals = {};
for (const packageName in packageConfig.dependencies)
  externals[packageName] = packageName;
for (const packageName in packageConfig.devDependencies)
  externals[packageName] = packageName;

const yassbConfig: webpack.Configuration = {
  entry: {
    index: './src/tools.ts'
  },
  devtool: false,
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    plugins: [
      new TsconfigPathsPlugin({ configFile: "./tsconfig.json", logLevel: 'INFO' }) as any
    ]
  },
  target: 'node14',
  node: {
    __dirname: false
  },
  externals,
  output: {
    path: join(__dirname, 'bundle'),
    filename: 'tools.js',
    library: 'YASSB',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        loader: 'html-loader',
        options: {
          minimize: false
        }
      },
      {
        test: /\.scss$|\.txt$/i,
        loader: 'raw-loader',
        options: {
          esModule: false,
        }
      },
      {
        test: /\.ts$|\.tsx$/,
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.json',
          happyPackMode: true
        }
      }
    ]
  },
  mode: 'production',
  optimization: {
    minimize: false
  }
};

// tslint:disable-next-line:no-default-export
export default [yassbConfig];
