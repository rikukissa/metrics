import fetch from "node-fetch";

interface IPullRequest {
  id: string;
  repo: string;
}
const PRAGMA = "<!-- _METRICS_ -->";
async function getExistingComment(pullRequest: IPullRequest, token: string) {
  const response = await fetch(
    `https://api.github.com/repos/${pullRequest.repo}/issues/${pullRequest.id}/comments`,
    {
      headers: {
        Authorization: `token ${token}`
      }
    }
  );
  const comments = await response.json();
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
    return fetch(
      `https://api.github.com/repos/${pullRequest.repo}/issues/${pullRequest.id}/comments/${existingComment.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `token ${token}`
        },
        body: JSON.stringify({ body: commentWithPragma })
      }
    );
  }

  return fetch(
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
