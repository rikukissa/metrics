import cp from "child_process";
import YAML from "yaml";
import { promisify } from "util";
import {
  findConfiguration,
  storeResults,
  IResult,
  getPreviousResults
} from "./storage";

const exec = promisify(cp.exec);

type Command = string;

interface IEnvironment {
  TRAVIS_PULL_REQUEST: string;
  TRAVIS_PULL_REQUEST_BRANCH: string;
  TRAVIS_BRANCH: string;
}

export async function getResults(configurationFile: string) {
  const configuration: { commands: { [name: string]: Command } } = YAML.parse(
    configurationFile
  );

  const results: IResult[] = [];
  for (const [name, command] of Object.entries(configuration.commands)) {
    const result = await exec(command);
    results.push({
      command: name,
      result: parseFloat(result.stdout.trim()),
      timestamp: new Date().toISOString()
    });
  }
  return results;
}

export function getChangeInfo(environment: IEnvironment) {
  if (environment.TRAVIS_PULL_REQUEST) {
    return {
      branch: environment.TRAVIS_PULL_REQUEST_BRANCH
    };
  }
  return {
    branch: environment.TRAVIS_BRANCH
  };
}

function getLatestResultForCommand(commandName: string, results: IResult[]) {
  return results.find(({ command }) => command === commandName)!.result;
}

async function run() {
  const config = await findConfiguration();
  const results = await getResults(config);
  const previousResults = await getPreviousResults();

  console.table(
    results.map(result => {
      const delta =
        result.result -
        getLatestResultForCommand(result.command, previousResults);
      return {
        ...result,
        delta,
        direction: delta > 0 ? "⬆️" : delta !== 0 ? "⬇️" : "-"
      };
    })
  );

  if (!process.env.TRAVIS) {
    return;
  }

  await storeResults(results);
}

if (require.main === module) {
  run();
}
