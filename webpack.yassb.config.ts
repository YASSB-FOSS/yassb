import { readJSONSync } from 'fs-extra';
import { join } from 'path';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import * as webpack from 'webpack';
import { DefinitionsBundler } from './definitions-bundler.plugin';
const DoneWebpackPlugin = require('done-webpack-plugin');

const packageConfig = readJSONSync('./package.json', { encoding: 'utf-8' });

const externals = {};
for (const packageName in packageConfig.dependencies)
  externals[packageName] = packageName;
for (const packageName in packageConfig.devDependencies)
  externals[packageName] = packageName;

const yassbConfig: webpack.Configuration = {
  entry: {
    index: './src/index.ts'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    plugins: [
      new TsconfigPathsPlugin({ configFile: "./tsconfig.json" })
    ]
  },
  plugins: [
    new DoneWebpackPlugin(() => {
      new DefinitionsBundler().process();
    })

  ],
  target: 'node14',
  node: {
    __dirname: false
  },
  externals,
  output: {
    path: join(__dirname, 'bundle'),
    filename: '[name].js',
    library: 'YASSB',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.json'
        }
      },
      {
        test: /\.tsx$/,
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.json'
        }
      },
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
