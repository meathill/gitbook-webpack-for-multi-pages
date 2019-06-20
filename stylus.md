Stylus 与响应式
========

这一章内容不多。正如前文所说，设计同事会把切好的页面交给我，里面大部分样式都写好了，我要做的只是根据需要变动一下。

会写这一章主要是看到还有同学在挣扎着使用 Less 和 Sass，前者语法较弱，后者需要依赖 Ruby，而 Ruby 对于墙内的同学来说，需要解决各种换源的问题——虽然 Sass 语法比 Less 强一些，不过也只是强一些而已，还是不如 Stylus。

Stylus 是基于 Node.js 开发的预处理语言，功能更强，使用也更方便。要在项目中配合 Webpack 使用，只需要配置合适的 loader 就可以了（关于串连 loader，可以看前面的 Webpack 介绍）：

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.styl$/,
        use: [
          'style-loader',
          'css-loader',
          'stylus-loader'
        ]
      }
    ]
  }
}
```


