#!/usr/bin/env node
const { join } = require("path");

require("ts-node").register({
  project: join(__dirname, "./tsconfig.json"),
  transpileOnly: true,
  ignore: [/node_modules\/(?!metrics)/]
});
require("./src/index.ts").run();
