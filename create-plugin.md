创建自己的插件
========

[HtmlWebpackPlugin](https://github.com/jantimon/html-webpack-plugin#plugins) 非常体贴的提供了一些[钩子](https://github.com/jantimon/html-webpack-plugin#events)，方便我们基于它开发自己的插件。它还提供了一些现成的插件供我们使用，大家可以看看有没有自己需要的，我就不一一介绍了。

有时候，保不齐会有些特殊需求，不太容易找到现成的工具，这个时候就需要我们自己动手，丰衣足食。好在写一个插件并不复杂，接下来，我就以本项目中我想实现的功能：给所有 `<img>` 加上 `loading="lazy"` 为例，讲解如何写 HtmlWebpackPlugin 的插件。

先介绍下这个属性。`loading="lazy"` 是 Chrome 浏览器新增的原生 lazy-load 功能，可以无缝集成到当前的页面当中，将来用户升级浏览器之后就会自动生效，实在应该立刻开始使用。

不过也因为这个功能太新，还没有现成的插件可以帮我们加，一个个手动加肯定不够经济，所以这里最好创建一个插件来做。HtmlWebpackPlugin 提供了若干钩子，分别对应 HTML 生成的不同阶段，我的打算是这样的：

1. 等 HTML 生成
2. 启动自己的函数
3. 分析生成的 HTML，给所有 `<img>` 加上 `loading="lazy"`
4. 返回修改过的 HTML

那么，结合前面提到的技术，我们要做的就是：

1. 加一个钩子，等待 `beforeEmit` 触发
2. 写函数
3. 用 [cheerio](https://cheerio.js.org/) 分析 HTMl，给 `<img>` 加属性
4. 返回

> cheerio 运行在纯 JS 环境下，提供类似 jQuery 的接口，可以大大提升操作 DOM 的效率。它不依赖 DOMParser，不需要浏览器环境，很多时候，如果我们要在 Node.js 里操作 HTML，cheerio 是不二的选择。

写成的函数是这样的，很简单，相信大家一眼就能看明白：

```js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const cheerio = require('cheerio');

class LazyLoadPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('LazyLoadPlugin', compilation => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
        'LazyLoadPlugin',
        (data, cb) => {
          const {html} = data;
          const $ = cheerio.load(html, {
            decodeEntities: false,
          });
          $('img').each((i, item) => {
            $(item).attr('loading', 'lazy');
          });
          data.html = $.html();
          cb(null, data);
        }
      );
    });
  }
}

module.exports = LazyLoadPlugin;
```

这个插件需要 html-webpack-plugin@4.0.0-beta 以上的版本才能运行。因为我只需要它在 build 的时候启动，所以我把它放在 webpack.config.prod.js 里。
