Pug 介绍及架构
========

[Pug](https://pugjs.org/) （以前叫 Jade）是一种模板语言，可以用来生成 HTML。它的写法比较像 CSS 选择器：

```pug
#hello
// -> <div id="hello"></div>

a.link-button Link
// -> <a class="link-button">Link</a>

a(href="https://blog.meathill.com/") 我的博客
// -> <a href="https://blog.meathill.com/">我的博客</a>
```

其实蛮好理解的。我认为它最大的优势在于：

1. 写法简单，只包含最关键的信息（我现在真的懒得写 HTML）
2. 支持模板语法，比如循环、条件、include、内容运算之类的

(2)中其实我很少用循环、条件这些，我认为用模板语言的最佳实践，就包括少把逻辑写在模板里。

更多复杂的 Pug 用法，请大家自行翻阅[文档](https://pugjs.org/api/getting-started.html)，我就不详细说明了。一些本项目中需要的用法，我会在后面详细说明。

在 Webpack 中使用
--------

前文提到，使用 Pug 模板的目的是生成静态 HTML 网页。Webpack v4 之后，所有的加载都会走 `module.rules`，所以我们要把合适的 loader 加入进来。

不幸的是，Pug 有三个 loader，分别是：[pug-loader](https://www.npmjs.com/package/pug-loader)，[pug-html-loader](https://www.npmjs.com/package/pug-html-loader)，[pug-plain-loader](https://www.npmjs.com/package/pug-plain-loader)，那么我们该用哪个呢？

坦白说这个问题当时困扰了我大约半天的时间。具体过程不展开了，说下最终方案吧：

1. pug-plain-loader 是 Vue 的作者为了在 Vue 中使用 Pug 模板开发的极简 loader，它的作用就是把 pug 转换成纯 HTML 字符串。不符合我们的需求，排除。
2. pug-html-loader 与之类似，也排除。
3. pug-loader 是将 pug 转换成模板函数，具体怎么用，交给下一级 loader。所以我们可以在编译过程中，加入外部变量，改变编译后的内容，很显然，这正是我们需要的。

最终配置如下：

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.pug$/,
        loader: 'pug-loader',
      },
    ],
  },
};
```

项目结构
--------

企业官网一般都有很多页面，这些页面视觉风格非常统一，而且会共享头部脚部。Pug 里可以用 `include` 引入其它 pug 页面，还可以使用 `extends` 继承其它 pug，在开发企业网站的时候非常方便好用。

这里，我使用会用一个 `template.pug` 作为基础框架，其它页面都会 `extends` 它。下面就是它的核心代码：

```pug
doctype html
html(lang=htmlLang)
  block vars
  head
    if lang === 'en'
      link(
        href='https://fonts.googleapis.com/css?family=Open+Sans:300italic,400italic,600italic,700italic,800italic,400,300,600,700,800&font-display=swap',
        rel='stylesheet',
      )
      // 以及其它英文字体

  body#page-top(class=[page, 'lang-' + lang].join(' '))

    nav#main-nav
      // 主导航

    block content

    include footer

    block links

    block scripts

    script(async)
      // 统计代码
```

请各位同学先看一下[继承](https://pugjs.org/language/inheritance.html)部分的文档，对 `extends` 和 `block` 有一些基础了解。接下来，我来解释一下这里的几个关键部分。（我会用行号来说明，如果大家看不到行号，麻烦自己查一下。）

1. 行2，这里用到了 Pug 的[属性语法](https://pugjs.org/language/attributes.html)，属性值可以是任何表达式，这里的 `htmlLang` 会在 build 时传入。
2. 行3，这里通过插入一个名为 `vars` 的块（`block`），方便子页面传入自定义的值，替换父页面，也就是框架 template.pug 里的默认值。
3. 行5-10，Pug 支持条件判断，所以这里我会检查当前语言，如果是英文 `en`，就引用 Google Fonts 对应的字体。
4. 行12，也是属性语法，把当前页面和语言都作为 `className` 放到 `<body>` 上，方便以后基于语言写特殊样式。
5. 行17，插入名为 `content` 的块，允许子模板填充内容。
6. 行19，嵌入 `footer.pug` 的内容。其实上面导航部分也可以提出 `nav.pug`，不过因为一些历史原因没这么做。
7. 行21、23，插入两个块，分别用来加载页面专属样式和页面专属脚本
8. 行25，统计代码，所有页面都会用到

然后在具体页面，比如“关于我们（`about.pug`)”里，就可以这样用：

```pug
extends ../template/template

block vars
  - var title = __('About Us')
  - var currentPage = 'about'

block content
  // 各种只属于 about 页的 html
```

这里，`about.pug` 继承了 `template.pug`，并且向 `vars` 块插入两个变量；然后向 `content` 块里插入页面内容。如此一来，所有页面都可以继承同样的模板，可以大大降低维护成本。

> 这里还有个注意事项：模板托管给用户自定义文件之后，html-webpack-plugin 的一些跟模板相关的配置就失效了，比如 `base`。

图片及其它资源的处理
--------

使用 Webpack，就是为了让它帮我们管理资源。之所以要选择 pug-loader，也是因为它会把 pug 转化成渲染函数，而不是 HTML 字符串。这样 webpack 就可以按 JS 处理资源引用了。

这个过程很简单，我们只要把 `<img src="/path/to/img">` 改成 `<img src=require('/path/to/img')>` 即可，利用了 Pug 自身的属性语法。改写后的模板大概长这个样子：

```pug
.timeline
  img.hidden-xs-down(src=require('../img/timeline.png'))
  img.hidden-sm-up(src=require('../img/timeline-v.png'))
```

视频音频也是如此，不再赘述。不过我们要理解，这样的写法，等效于：

```js
const timeline = require('../img/timeline.png');

const html = '<img class="hidden-xs-down" src="' + timeline + '">';
```

对于 Webpack 而言，需要专门的 file-loader 负责处理 png 等图形文件的引用，所以我们还要改一下 Webpack 的配置文件，加入下面几行：

```js
module.exports = {
  module: {
    rules: [
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
};
```

注意这里的 `publicPath`。大家可能还记得上一章提到，我厂要求不同针对不同语言生成不同的编译结果，这里就是用来将静态资源复制到指定目录的。
