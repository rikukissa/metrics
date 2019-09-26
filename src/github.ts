import fetch from "node-fetch";

type Args<T> = T extends (...params: infer P) => void ? P : never;

async function request(...args: Args<typeof fetch>) {
  const res = await fetch(...args);

  if (Math.floor(res.status / 100) !== 2) {
    throw new Error(res.statusText);
  }

  return res.json();
}

interface IPullRequest {
  id: string;
  repo: string;
}
const PRAGMA = "<!-- _METRICS_ -->";
async function getExistingComment(pullRequest: IPullRequest, token: string) {
  const comments = await request(
    `https://api.github.com/repos/${pullRequest.repo}/issues/${pullRequest.id}/comments`,
    {
      headers: {
        Authorization: `token ${token}`
      }
    }
  );

  return comments.find(({ body }: { body: string }) => body.includes(PRAGMA));
}

export async function createComment(
  comment: string,
  pullRequest: IPullRequest,
  token: string
) {
  const commentWithPragma = `${PRAGMA}\n${comment}`;
  const existingComment = await getExistingComment(pullRequest, token);

  if (existingComment) {
    return request(
      `https://api.github.com/repos/${pullRequest.repo}/issues/comments/${existingComment.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `token ${token}`
        },
        body: JSON.stringify({ body: commentWithPragma })
      }
    );
  }

  return request(
    `https://api.github.com/repos/${pullRequest.repo}/issues/${pullRequest.id}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${token}`
      },
      body: JSON.stringify({ body: commentWithPragma })
    }
  );
}
