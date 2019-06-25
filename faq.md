总结
========

至此，关于本次官网改版的技术分享基本告一段落，我基本上分享了我本项目的所有收获。这里再总结一下：

1. 使用 Webpack 打包
2. 使用多个 html-wepback-plugin 输出多 HTML 页面
3. 使用 Pug 写模板
4. 利用 Pug 支持内建函数的方式实现 i18n
5. 使用 Stylus 写样式
6. 基于 Bootstrap 的布局系统完成响应式
7. 利用 Chrome 内建的 Audit 工具检查网站，并修复其中不好的地方
8. 利用 html-webpack-plugin 的钩子开发插件，利用浏览器新特性。


常见问题
========

Webapck 应该装在哪儿？
--------

答：项目中直接使用 Webpack 的机会不多，所以全局安装也可以，而且比较省硬盘。不过我还是建议大家装在项目本地，这样不同的项目如果依赖不同的工具链，比较方便共存。

能看下真实项目么？
--------

答：项目本身属于我厂，业务代码不便公开。跟本文相关的配置文件，我放在下面：

webpack.config.js

```js
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
```

webpack.config.i18n.js

```js
const path = require('path');
const {cloneDeep} = require('lodash');
let config = require('./webpack.config');

/* global __dirname */

module.exports = config
  .then(config => {
    config = cloneDeep(config);
    config.output.path = path.resolve(__dirname, '../tmp/');
    return config;
  });

```

webpack.config.prod.js

```js
const {defaults} = require('lodash');
const {DefinePlugin} = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const LazyLoadPlugin = require('./lazyload');

const base = require('./webpack.config');
const config = require('../config/prod');

/* global __dirname */

module.exports = base.then(base => {
  base.plugins[0] = new DefinePlugin(config);
  return defaults({
    mode: 'production',
    devtool: false,

    module: {
      rules: base.module.rules.map(rule => {
        if (!rule.test.test('a.styl')) {
          return rule;
        }
        rule.use[0] = MiniCssExtractPlugin.loader;
        return rule;
      }),
    },

    plugins: [new CleanWebpackPlugin()].concat(
      base.plugins,
      [
        new MiniCssExtractPlugin({
          filename: 'screen.css',
        }),
        new LazyLoadPlugin(),
      ]
    ),

    optimization: {
      minimizer: [
        new OptimizeCSSAssetsPlugin(),
        new TerserPlugin({
          cache: true,
          parallel: true,
          exclude: /node_modules/,
          terserOptions: {
            ecma: 7,
            toplevel: true,
            compress: {
              drop_console: true,
            },
          },
        }),
      ],
    },
  }, base);
});

```
