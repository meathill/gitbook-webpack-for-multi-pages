实现 i18n
========

这个需求比较重要，所以单独拿出来说。

前情提要
--------

i18n 的实现，是本次工具链升级里我比较得意的一个方面。看过[切页面的历史](history.md)的同学应该知道，类似企业官网这种项目，大部分页面都是静态 HTML，工具脚手架也集中处理周边资源，对 HTML 本身着墨不多。升级前的工具链基于 Gulp，也存在这个问题。

如果想 i18n，必须解决两个问题：

1. 能够快速从页面中提取要翻译的文案。这些文案可能是 `textContent`，也可能是标签的 `title`，甚至某些自定义标签。
2. （可选）可以使用大家熟悉的 i18n 工具链，比如 gettext。
3. 能够让普通用户方便的添加、修改、维护内容。
4. 能够把翻译后的字段准确插回页面。

升级前的方案，我是这么做的：

1. 选择中文作为基础文案（因为移交给我的时候是中文）。
2. 选择 [gettext](https://www.gnu.org/software/gettext/) 方案，即 WordPress 等流行产品采用的方案。
2. 用 [cheerio](https://github.com/cheeriojs/cheerio) 抽取文案，很丑，各种 hardcode。
3. 生成 po 文件，翻译之。
4. 继续用 cheerio，把翻译插入，生成翻译后的网页。

最后的方案在大部分时间也能正常工作，但是整个过程会生成大量的临时文件，而且代码很多，很难读懂。

新方案
--------

好，接下来开始秀新方案。

(1)(2)(4)不变，主要改变的是“提取待翻译的文案”和“将翻译后的文案插入页面”这两步。

### 修改模板

前面说过，Pug 支持模板内表达式，除了简单的加减乘除、三元运算，还可以调用函数。所以我们可以把所有文案都替换成 `__('some text')` 这样的翻译函数输出内容。（`__` 似乎是个 gettext 风格，比如 WordPress 里就很常见。）

随便摘抄一段代码，是这样的：

```pug
a.feature-item(href='./edge/#feature1', target='_blank')
  img.edge-item-img(
    src=require('../svg/subnav1.svg'),
    alt=__('Distributed Load Balancer'),
  )
  p #{__('Distributed Load Balancer')}

h2 !{__('History of OpenResty<sup>®</sup>')}
```

首先，属性部分，上一章说过，直接用属性语法 `attr=` 调用。其次，文本可以使用表达式 `#{}` 调用。最后，如果文案当中有一些特殊标签，不想拆成多段，可以考虑用 `!{}`，Pug 会把里面的字符串当成 HTML 填充进去，使用时注意防 XSS 哦。

这次改版升级，HTML 仍然是由设计同事完成的。所以我会用 [html2pug](https://www.npmjs.com/package/html2pug) 把 HTML 转换成 pug，然后把里面的文案用上面说的方法修改（如果有需要的话，将来这个步骤可以交给设计同事，其中没有什么特别难理解的东西）。

### 实现 `__()`

翻译函数 `__()` 实现其实很简单。首先，它需要放在全局上下文，因为 Pug 在编译时只会从全局环境执行表达式。其次，我也不需要它功能很强大，因为功能强大必然变得复杂，一旦它变得复杂，移交给设计同事就变得很困难。

```js
// 这里保存的是一些 meta 信息
const translation = require(`../lang/${lang}`);
// 这个变量里保存的是整站的翻译，现在还是空的，等下会填充
let po;

// 因为编译过程在 Node.js 里执行，所以全局是 `global`
// 其它就是有翻译输出翻译，没翻译输出原文
global.__ = function (value) {
  if (!po || !po[value]) {
    return value;
  }
  let translation = po[value];
  translation = isArray(translation) ? translation.join('') : translation;
  return translation || value;
};
```

### 修改 Webpack 配置

翻译存在 PO 文件里，我们要把它读出来，然后放到 `po` 变量里。这个过程是异步的，怎么放在配置文件里执行呢？Webpack 已经提前做好了准备，配置文件除了导出包含配置的对象外，还可以导出 Promise，Webpack 会等到 Promise resolve 后再用其返回值继续运行。

所以我们可以这样修改配置文件：

```js
// 先是各种配置
const config = { /*....*/ };

// 前面的 __ 定义
global.__ = function (value) { /*....*/ };

// 导出 Promise
module.exports = Promise.resolve()
  .then(() => {
    // 读取 PO 文件
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
    // Promise.reject 时，error 是字符串
    // 没有 PO 文件是合理的，表示输出原文本，也就是模板里自带的英文
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

### 生成 PO 文件

我们只要稍微把 `__()` 修改一下，就可以生成 PO 文件了。Webpack 除了通过命令行执行，还可以放在 JS 里运行。完整的提取文本生成 PO 文件的代码如下：

```js
const {promises: {writeFile, readFile}} = require('fs');
const path = require('path');
const {promisify} = require('util');
const webpack = require('webpack');
// 这是为提取文本写的配置文件，主要目的是避免生成文件
const config = require('./build/webpack.config.i18n');

/* global __dirname */

// 覆盖前面的 `__`，把文本放入一个 `Set` 备用
let messages = new Set();
global.__ = function(value) {
  messages.add(value);
  return value;
};

// `webpack` 导入后是个 Node.js 风格的函数：`wepback(config, (err, value))`
// 所以可以用 `promisify` 把它改造成返回 Promise 的函数
const webpackP = promisify(webpack);

// 接下来就把文案放到一个 `Set` 里，然后把它写到 PO 文件里即可：
config
  .then(config => {
    return webpackP(config);
  })
  .then(async() => {
    console.log('start creating en.pot: ', messages.size, 'messages');
    let base = await readFile(path.resolve(__dirname, './lang/base.pot'), 'utf8');
    messages = [...messages].map(message => {
      message = message.replace(/"/g, '\\"');
      return `msgid "${message}"
msgstr ""`;
    });
    base = base.replace('{{create_time}}', (new Date()).toDateString());
    messages.unshift(base);
    await writeFile(path.resolve(__dirname, './lang/en.pot'), messages.join('\n\n'), 'utf8');
    console.log('en.pot created successfully');
  });
```

总结
--------

最后总结一下新的 i18n 方案：

1. 设计同事完成设计和 HTML 制作
2. 使用 html2pug 转换成 pug
3. 将其中要翻译的文案替换成 `__('文案')`
4. 在项目目录运行 `node extract-texts` 或者 `npm run i18n:extract`
5. 运行 `msgcat -o cn.po cn.po en.pot` 把新生成的未翻译文本与已翻译文本合并
6. 使用 [POEdit](https://poedit.net/download) 翻译
7. 运行 `TARGET_LANG=cn NODE_ENV=production webpack --config build/webpack.config.prod.js --mode=production` 生成指定语言版本
