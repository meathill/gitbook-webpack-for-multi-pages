const path = require('path');
const {promises: {readFile}, existsSync} = require('fs');
const {DefinePlugin} = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const po2json = require('po2json');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const {isArray, isString} = require('lodash');
const DEV = require('../config/dev');

/* global __dirname */
const devMode = process.env.NODE_ENV !== 'production';
const lang = process.env.TARGET_LANG || 'en';
console.log('Current mode: ', devMode ? 'Development' : 'Production');
console.log('Current language: ', lang);
const destDir = path.resolve(__dirname, `../../${lang}`);

const translation = require(`../lang/${lang}`);
let po;

global.__ = function (value) {
  if (!po || !po[value]) {
    return value;
  }
  let translation = po[value];
  translation = isArray(translation) ? translation.join('') : translation;
  return translation || value;
};

const config = {
  context: path.resolve(__dirname, '../js'),
  entry: {
    index: './index.js',
    edge: './edge',
    about: './about.js',
    comparison: './about.js',
    contact: './about.js',
    forget: './forget.js',
    login: './login.js',
    logout: './logout.js',
    price: './price.js',
    profile: './profile.js',
    register: './register.js',
    reset: './reset.js',
    trial: './trial.js',
    verify: './verify.js',
  },
  output: {
    path: destDir,
    filename: '[name].js',
    publicPath: devMode ? '/' : `/${lang}/`,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /(pages|template)\/[a-zA-Z0-9-]+\.pug$/,
        loader: 'pug-loader',
      },
      {
        test: /\.pug$/,
        loader: 'pug-plain-loader',
        exclude: /(pages|template)\//,
      },
      {
        test: /\.styl(us)?$/,
        use: [
          'style-loader',
          'css-loader',
          'stylus-loader',
        ],
      },
      {
        test: /\.(png|jpg|gif|svg|woff2|eot|woff|ttf|ico)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'assets',
              publicPath: devMode ? '/assets' : `/${lang}/assets`,
            },
          },
        ],
      },
    ],
  },
  devtool: 'source-map',
  mode: 'development',
  resolve: {
    extensions: ['.js', '.json', '.vue'],
  },
  plugins: [
    new DefinePlugin(DEV),
    new VueLoaderPlugin(),
  ],
  externals: {
    'swiper': 'Swiper',
    'mediaelement': 'MediaElementPlayer',
    'jquery': 'jQuery',
    'vue': 'Vue',
    'axios': 'axios',
  },
  devServer: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://stage.openresty.com/',
        changeOrigin: true,
        autoRewrite: true,
        secure: false,
        onProxyRes(proxyRes) {
          const key = 'set-cookie';
          if (proxyRes.headers[key]) {
            const cookies = proxyRes.headers[key].join('').split(' ');
            proxyRes.headers[key] = [cookies[0], 'Path=/'].join(' ');
            console.log(proxyRes.headers[key]);
          }
        },
      },
      '/create-captcha': {
        target: 'https://api.openresty.com',
        changeOrigin: true,
        autoRewrite: true,
        secure: false,
      },
      '/25ff3f074ae8fc': {
        target: 'https://api.openresty.com',
        changeOrigin: true,
        autoRewrite: true,
        secure: false,
      },
    },
  },
};

const pages = Object.keys(config.entry);
config.plugins = config.plugins.concat(pages.map(page => {
  return new HtmlWebpackPlugin({
    filename: page === 'index' ? `${page}.html` : `${page}/index.html`,
    template: path.resolve(__dirname, `../pages/${page}.pug`),
    chunks: [page],
    templateParameters: {
      ...translation,
      lang,
      page,
      devMode,
    },
  });
}));

module.exports = Promise.resolve()
  .then(() => {
    const poPath = path.resolve(__dirname, `../lang/${lang}.po`);
    if (!existsSync(poPath)) {
      return Promise.reject('PO file not founded.');
    }

    return readFile(poPath, 'utf8');
  })
  .then(poData => {
    po = po2json.parse(poData);
  })
  .catch(error => {
    if (isString(error)) {
      console.log('[Log]', error);
      return;
    }
    throw error;
  })
  .then(() => {
    return config;
  });
