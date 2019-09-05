import cp from "child_process";
import Table from "cli-table";
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
  if (key === "command") {
    return "";
  }
  if (key === "status") {
    return "Δ";
  }
  if (key === "current") {
    return "This branch";
  }
  if (key === "master") {
    return "Upstream";
  }
  return key;
}

interface ITableItem {
  status: string;
  command: string;
  current: number;
  master: string;
}

const COLUMN_ORDER: Array<keyof ITableItem> = [
  "status",
  "command",
  "current",
  "master"
];
function createConsoleTable(data: Array<Partial<ITableItem>>) {
  if (data.length === 0) {
    return "";
  }

  const labels = Object.keys(data[0]) as Array<keyof typeof data[0]>;
  const columns = COLUMN_ORDER.filter(column => labels.includes(column));

  const table = new Table({
    colAligns: ["middle"],
    head: columns.map(columnNameToHeader)
  });
  table.push(...data.map(row => columns.map(column => row[column])));
  return table.toString();
}

function createMarkdownTable(data: ITableItem[]) {
  if (data.length === 0) {
    return "";
  }

  const firstRow = `| ${COLUMN_ORDER.map(columnNameToHeader).join(" | ")} |`;
  const secondRow = `| ${COLUMN_ORDER.map(() => "---").join("|")} |`;
  const content = data
    .map(row => `| ${COLUMN_ORDER.map(column => row[column]).join(" | ")} |`)
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
      command: result.command,
      current: result.current
    };
  });

  const info = getChangeInfo(process.env as any);

  if (!info.pr) {
    console.log(createConsoleTable(tableRowsWithoutStatus));
    return;
  }
  const previousResults = await getPreviousResults(info.pr.repo);

  const tableRows: ITableItem[] = tableRowsWithoutStatus.map(result => {
    const latest = getLatestResultForCommand(result.command, previousResults);
    const delta = latest !== null ? result.current - latest : 0;

    return {
      ...result,
      master: latest === null ? "-" : latest.toString(),
      status:
        delta > 0
          ? `↑ ${getDeltaString(delta)}`
          : delta !== 0
          ? `↓ ${getDeltaString(delta)}`
          : "="
    };
  });

  console.log(createConsoleTable(tableRows));
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

  await createComment(
    createMarkdownTable(tableRows),
    info.pr,
    process.env.GITHUB_TOKEN!
  );
}

if (require.main === module) {
  run();
}
