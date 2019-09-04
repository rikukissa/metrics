#!/usr/bin/env node

require("ts-node").register({
  compilerOptions: require("./tsconfig.json").compilerOptions,
  transpileOnly: true
});
require("./src/index.ts").run();
