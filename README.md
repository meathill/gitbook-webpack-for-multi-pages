使用 Webpack 开发多页面站点
========

前言
========

最近我厂官网改版，我尝试用 Webpack 重建了开发工具链，效果不错，配置代码少了很多，逻辑更加简单清晰。我觉得值得拿出来分享一下。

> 重建之前的 v1，我给同事讲解了半天，她也没搞懂；重建之后的 v2，她看了下配置文件就明白了。

Webpack 的核心是“pack”，即“打包”。打包的依据是 JS，任何在 JS 里引用的资源，都接受 webpack 的管理，会被放在合适的位置，得到合适的加载。在早期 Web 开发当中，一个组件可能同时包含 HTML + CSS + JS + 字体 + 图片 + 其它资源，全部手动管理非常费劲。各种引用，各种复制，还常常在部署的时候出问题。有了 webpack 之后简直不要太轻松，还有 webpack-dev-server 支持自动刷新，所以在新项目中我几乎都会用 webpack。

在 SPA 项目中，使用 webpack 很顺畅，但是在企业官网项目里，webpack 就显得有些鸡肋了：

1. 企业官网重展示轻功能，没有复杂的交互，基本都是静态 HTML
2. 很多页面，比如“关于我们”、“产品介绍”，并不需要 JS；即使用到 JS，也多半只是很简单的交互
3. 需要国际化（i18n，生成多语言版本）

所以我之前选用 gulp 工具链，逻辑并不复杂，但是因为全部资源都要自己管理，代码就很多，维护起来比较麻烦，团队协作也不容易。而且：

1. 没有 dev-server 和自动刷新
2. 生成大量的临时文件，依赖 nginx 配置服务器
3. 部署的路径变化时，改动很大，隐患很多

这次下定决心用 webpack 重构，踩了不少坑，摸索了不少新工具，最终效果比较理想。不仅解决了之前的问题，还摸索出更好的 i18n 方案，顺带学习了基于 [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) 创建新插件的做法，可以将页面优化进一步自动化。希望能带给大家一些帮助。

本次的分享大纲
--------

本次分享，将重点讲解以下内容：

1. Webpack 基础和进阶，如何配置多页面项目
2. 使用 Pug 编写页面逻辑，完成 i18n
3. 使用 Stylus 写样式，响应式
4. 审计页面、优化页面
5. 创建插件自动优化页面

面向读者
--------

这次会尽量写的浅显易懂，内容尽可能全面，不过毕竟只是一次 Chat，不是一套完整的从入门到精通的实战课，所以还是需要诸位读者有一定的开发基础，能够理解范例代码；有比较良好的学习习惯，能够自行补足不具备的知识。

本文主要面向：

1. 网页重构工程师
2. 想充分了解前端工具链的同学

当然，大家有任何看不懂想不通的问题，也可以直接向我提问。如果大家希望看到更多细或者节更详细的教程，也不妨告诉我。

名词及约定
--------

1. Webpack 每个大版本都会有一些关键性的变动，所以在尝试本文的配置时也一定要选用正确的版本。本项目在实际生产中使用的是最新的 Webapck 4.33 版本，其它依赖项，如 loader、插件都需要匹配这个核心版本。
2. 范例代码以 ES6 为基础，也会使用 ES2017+ 新增语法，如果你对这些“新”语法不熟悉，附录里有一些资源方便你学习。

### 名词：

* 使用者：指用 jQuery 开发业务逻辑的人，也就是你我。
* 经典（版）：指《设计模式》中的内容

### 文中代码的目标环境：

* Node.js >= 12.4.0
* Webpack >= 4.33.0
* Webpack-cli >= 3.11.0
* Babel >= 7

作者介绍
--------

大家好，我叫翟路佳，花名“肉山”，这个名字跟 Dota 没关系，从高中起伴随我到现在。

我热爱编程，喜欢学习，喜欢分享，从业十余年，投入的比较多，学习积累到的也比较多，对前端方方面面都有所了解，希望能与大家分享。

我兴趣爱好比较广泛，尤其喜欢旅游，欢迎大家相互交流。

我目前就职于 OpenResty Inc.，定居广州。

你可以在这里找到我：

* [博客](https://blog.meathill.com/)
* [微博](https://weibo.com/meathill)
* [GitChat](https://gitbook.cn/gitchat/author/593cb520ef8d9c2863173543)

或者通过 [邮件](mailto:meathill@gmail.com) 联系我。

限于个人能力、知识视野、文字技术不足，文中难免有疏漏差错，如果你有任何疑问，欢迎在任何时间通过任何形式向我提出，我一定尽快答复修改。

再次感谢大家。
