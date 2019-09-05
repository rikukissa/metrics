import cp from "child_process";

import { promisify } from "util";

import {
  findConfiguration,
  storeResults,
  IResult,
  getPreviousResults,
  IConfigurationFile
} from "./storage";
import { createComment } from "./github";

const exec = promisify(cp.exec);

interface IEnvironment {
  TRAVIS_PULL_REQUEST: string;
  TRAVIS_PULL_REQUEST_BRANCH: string;
  TRAVIS_BRANCH: string;
  TRAVIS_PULL_REQUEST_SLUG: string;
}

export async function getResults(configurationFile: IConfigurationFile) {
  const results: IResult[] = [];
  for (const { name, command } of configurationFile.commands) {
    const result = await exec(command);
    results.push({
      command: name,
      current: parseFloat(result.stdout.trim()),
      timestamp: new Date().toISOString()
    });
  }
  return results;
}

export function getChangeInfo(environment: IEnvironment) {
  if (environment.TRAVIS_PULL_REQUEST) {
    return {
      pr: {
        id: environment.TRAVIS_PULL_REQUEST,
        repo: environment.TRAVIS_PULL_REQUEST_SLUG
      },
      branch: environment.TRAVIS_PULL_REQUEST_BRANCH
    };
  }
  return {
    pr: null,
    branch: environment.TRAVIS_BRANCH
  };
}

function getLatestResultForCommand(commandName: string, results: IResult[]) {
  const result = results.find(({ command }) => command === commandName);

  if (!result) {
    return null;
  }

  return result.current;
}

function columnNameToHeader(key: string) {
  if (key === "command" || key === "status") {
    return "";
  }
  if (key === "delta") {
    return "Δ";
  }
  if (key === "current") {
    return "This branch";
  }
  return key;
}

interface ITableItem {
  delta: string;
  status: string;
  command: string;
  current: number;
  master: string;
}

function table(data: ITableItem[]) {
  if (data.length === 0) {
    return "";
  }

  const columns: Array<keyof ITableItem> = [
    "status",
    "command",
    "current",
    "master",
    "delta"
  ];

  const firstRow = `| ${columns.map(columnNameToHeader).join(" | ")} |`;
  const secondRow = `| ${columns.map(() => "---").join("|")} |`;
  const content = data
    .map(row => `| ${columns.map(column => row[column]).join(" | ")} |`)
    .join("\n");

  return `${firstRow}\n${secondRow}\n${content}`;
}

function getDeltaString(value: number) {
  if (value > 0) {
    return `+${value}`;
  }
  return value.toString();
}

export async function run() {
  const config = await findConfiguration();
  const results = await getResults(config);

  const tableRowsWithoutStatus = results.map(result => {
    return {
      delta: getDeltaString(0),
      command: result.command,
      current: result.current
    };
  });

  const info = getChangeInfo(process.env as any);

  if (!info.pr) {
    console.table(tableRowsWithoutStatus);
    return;
  }
  const previousResults = await getPreviousResults(info.pr.repo);

  const tableRows: ITableItem[] = tableRowsWithoutStatus.map(result => {
    const latest = getLatestResultForCommand(result.command, previousResults);
    const delta = latest !== null ? result.current - latest : 0;

    return {
      ...result,
      delta: getDeltaString(delta),
      master: latest === null ? "-" : latest.toString(),
      status: delta > 0 ? "⬆️" : delta !== 0 ? "⬇️" : "✅"
    };
  });

  console.table(tableRows);
  if (!process.env.GITHUB_TOKEN) {
    console.info("No Github token set");
    return;
  }
  if (!process.env.TRAVIS) {
    return;
  }

  if (info.branch === "master") {
    await storeResults(results, info.pr.repo);
    return;
  }

  if (!info.pr) {
    return;
  }

  await createComment(table(tableRows), info.pr, process.env.GITHUB_TOKEN!);
}

if (require.main === module) {
  run();
}
