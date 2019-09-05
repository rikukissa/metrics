import { promisify } from "util";
import fs from "fs";
import { join } from "path";
import fetch from "node-fetch";
import YAML from "yaml";
const readFile = promisify(fs.readFile);

export interface IResult {
  timestamp: string;
  command: string;
  current: number;
}

export async function getPreviousResults(repo: string): Promise<IResult[]> {
  const response = await fetch(
    `https://metrics-backend.herokuapp.com/metrics/${repo}`
  );
  const results: IResult[] = await response.json();

  return results.sort(
    (a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf()
  );
}
export async function storeResults(results: IResult[], repo: string) {
  for (const result of results) {
    const response = await fetch(
      `https://metrics-backend.herokuapp.com/metrics/${repo}`,
      {
        method: "POST",
        body: JSON.stringify(result)
      }
    );
    await response.json();
  }
}

export interface IConfigurationFile {
  commands: Array<{ name: string; command: string }>;
}

export async function findConfiguration(): Promise<IConfigurationFile> {
  const cwd = process.cwd();
  const file = await readFile(join(cwd, "./metrics.yml"));
  return YAML.parse(file.toString());
}
