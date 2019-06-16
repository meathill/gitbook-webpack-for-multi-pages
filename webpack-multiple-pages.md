Webpack 配置多页开发
========

终于要进入正题了，大家不要嫌我啰嗦，知其然，还要知其所以然。这样才能面对任何问题都无往而无不利。

不过在开始之前，还是要补充几个概念。

1. 插件。在 Webpack 里，loader 负责接入依赖，插件负责输出结果。
2. 多入口。Webpack 本身就支持多入口，不过并不支持对特定入口做特定配置。
3. 但是插件可以针对不同入口输出不同内容，也就是我们今天的工具基础。

HTML Webpack Plugin
--------

为了能够输出静态 HTML，我们要用到一个插件：[HTML Webpack Plugin](https://github.com/jantimon/html-webpack-plugin)。这是个官方插件，效果很好，维护比较充分，建议大家好好看看它的文档，我们接下来的操作基本都与它有关。

使用它的方式很简单：

1. 安装
    ```js
    npm i html-webpack-plugin -D
    ```
2. 在配置文件里使用
    ```js
    const HtmlWebpackPlugin = require('html-webpack-plugin');

    modules.exports = {
      // 其它配置略
      plugins: [
        new HtmlWebpackPlugin({
          //...options
        }),
      ],
    };
    ```

这样会在输出文件夹里（如前文所说，默认是 `dist/`）生成一个 index.html 文件，内容大概是：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Webpack App</title>
  </head>
  <body>
    <script src="main.js"></script>
  </body>
</html>
```

从这段 HTML 里可以看出，HTML Webpack Plugin 已经帮我们把打包好 JS 路径通过 `<script>` 插入到文档里面，我们只需要 serve 这个 index.html，就可以让用户使用这个网页服务了。而且，无论需要嵌入多少资源，比如提取出 CSS，或者对 JS 进行切分（chunk），它都会自动把对应的标签插入页面。

生成多个 HTML
--------

企业官网大多数由数个静态页组成，如果想同时输出这些静态页，就要同时使用多个 HTML Webpack Plugin，并利用它们的 `template` 参数设置不同的模板。

构建 HTML Webpack Plugin 时可以传入一个 `options` 参数，里面包含若干选项，具体有哪些选项分别表示什么含义，请大家到[文档](https://github.com/jantimon/html-webpack-plugin#options)中一探究竟。这里我直接介绍本方案中的两个核心：`template` 和 `chunks`。

`template` 属性可以指定插件用哪个模板生成 HTML。在我们的项目结构里，基本上每个静态页都对应一个模板，有几个页面就会有几个模板。`chunks` 属性指定页面里加载哪些 JS，及其包含的资源。

这么说来太过抽象，我还是上代码吧：

```js
const config = {
  context: path.resolve(__dirname, '../js'), // 先指定 JS 的位置
  entry: {
    // 这些是所有页面的入口 js
    // 其中，关于我们（about）、功能对比（comparison）、联系我们（contact）其实都是纯静态
    // 里面一点功能性代码都没有，只是引用样式文件，所以它们仨共享一个物理 JS
    index: './index.js',
    edge: './edge',
    about: './about.js',
    comparison: './about.js',
    contact: './about.js',
  },
};

// 根据入口文件生成 HTML
const pages = Object.keys(config.entry);
config.plugins = config.plugins.concat(pages.map(page => {
  // 每个入口文件都会用一个和它同名的模板文件生成同名的 html
  // 需要多少个 HTML，就构建多少个 HTML Webpack Plugin 实例
  return new HtmlWebpackPlugin({
    // 我厂要求首页=/index.html，其它功能页生成子目录，比如关于我们(about)=/about/index.html
    filename: page === 'index' ? `${page}.html` : `${page}/index.html`,
    // 根据当前页面的名称，找到合适的 pug 文件
    // 关于 pug 使用，请看下一章节
    template: path.resolve(__dirname, `../pages/${page}.pug`),
    // 这个页面里只加载和本页相关的资源
    // 注意这里不能是 `${page}.js`，因为我们会把其它资源提取出来，独立存在物理文件
    // 有扩展名的话，就不会加载其它文件了
    chunks: [page],
  });
}));
```

解释都在代码里了，看起来也不是很难，对吧？

统一的 CSS
--------

企业官网的风格会非常统一，其它各页面都会延续首页的设计，所以我们并不需要给每个页面都生成一份独立 CSS 文件。最常见的做法是：把所有样式放在一个文件里，然后去重、压缩，接下来所有页面都加载这个 CSS。这个需求可以通过另一个插件：[Mini CSS Extract Plugin](https://github.com/webpack-contrib/mini-css-extract-plugin) 来完成。

Mini CSS Extract Plugin 也是官方插件，大家可以放心使用。它可以把页面里的 CSS 抽取到独立的文件当中，甚至可以根据模块切分，不过我们暂时不需要切分。哦，对了，这个插件需要 Webpack 4。

配置这个插件的方式也比较简单，在开发环境下，我会选择不用这个插件；在生成环境下才引入它，接下来，只要配置输出文件的文件名即可：

```js
const {defaults} = require('lodash');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const base = require('./webpack.config');

module.exports = defaults({
  module: {
    // 这里用 MiniCssExtractPlugin 的 loader 替换 style-loader
    // 方便输出到独立 CSS 文件
    rules: base.module.rules.map(rule => {
      // 我用 stylus 写样式，它的扩展名是 .styl，我只替换这部分规则
      if (!rule.test.test('a.styl')) {
        return rule;
      }
      rule.use[0] = MiniCssExtractPlugin.loader;
      return rule;
    }),
  },

  // 使用插件生成单独的 CSS 文件
  plugins: base.plugins.concat([
    new MiniCssExtractPlugin({
      filename: 'screen.css',
    }),
  ]),
}, base);
```

我所有的 JS 都会引用 `screen.styl`，所有样式都写在里面。生成的所有 HTML，里面都会有 `<link rel="stylesheet" href="screen.css">`。

不过实际中我遇到一个问题：Node.js 10.x 版本下，会报错，说不能重复写入 screen.css；但是 Node.js 12.x 就没问题。这个问题我暂时没研究，大家有空的话可以看看。

--------

好，多页的部分到此基本完成，接下来我们来处理模板和样式。
