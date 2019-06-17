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
