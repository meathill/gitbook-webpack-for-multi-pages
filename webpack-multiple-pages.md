Webpack 配置多页开发
========

终于要进入正题了，大家不要嫌我啰嗦，知其然，还要知其所以然。这样才能面对任何问题都无往而无不利。

不过在开始之前，还是要补充几个概念。

1. 插件。在 Webpack 里，loader 负责接入依赖，插件负责输出结果。
2. 多入口。Webpack 本身就支持多入口，不过并不支持对特定入口做特定配置。
3. 但是插件可以针对不同入口输出不同内容，也就是我们今天的工具基础。

HTML Webpack Plugin
--------

为了能够输出静态 HTML，我们要用到一个插件：[HTML Webpack Plugin](https://github.com/jantimon/html-webpack-plugin)。这是个官方插件，建议大家先看看它的文档。使用它的方式很简单：

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
        new HtmlWebpackPlugin(),
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

从这段 HTML 里可以看出，HTML Webpack Plugin 已经帮我们把打包好 JS 路径通过 `<script>` 插入到文档里面，我们只需要 serve 这个 index.html，就可以让用户使用这个网页服务了。

生成多个 HTML
--------
