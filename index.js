#!/usr/bin/env node

require("ts-node").register({
  compilerOptions: require("./tsconfig.json").compilerOptions
});
require("./src/index.ts").run();
