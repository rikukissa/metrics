import { promisify } from "util";
import fs from "fs";
import { join } from "path";
import fetch from "node-fetch";
import YAML from "yaml";
const readFile = promisify(fs.readFile);

const AIRTABLE_SPACE = process.env.AIRTABLE_SPACE;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

export interface IResult {
  timestamp: string;
  command: string;
  current: number;
}

export const enabled = () => AIRTABLE_SPACE && AIRTABLE_TOKEN;

export async function getPreviousResults(): Promise<IResult[]> {
  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_SPACE}/Table%201?sort[0][field]=timestamp&sort[0][direction]=desc`,
    {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    }
  );
  const results = await response.json();

  if (results.error) {
    throw new Error(results.error.type + " " + results.error.message);
  }

  return results.records.map(({ fields }: { fields: IResult }) => fields);
}
export async function storeResults(results: IResult[]) {
  for (const result of results) {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_SPACE}/Table%201`,
      {
        method: "POST",
        body: JSON.stringify({ fields: result }),
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    const res = await response.json();
    if (res.error) {
      throw new Error(res.error.type + " " + res.error.message);
    }
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
