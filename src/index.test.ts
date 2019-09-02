import { getResults } from ".";
// import { promisify } from "util";
// import cp from "child_process";

// const exec = promisify(cp.exec);

describe("getResults", () => {
  describe("given a yaml config with commands", () => {
    it("returns a table or results", async () => {
      await expect(
        getResults(`
      commands:
        first: "echo '1'"
        second: "echo '2'"
      `)
      ).resolves.toEqual({
        first: 1,
        second: 2
      });
    });
  });
});

// jest.mock("./storage", () => ({
//   __esModule: true,
//   storeResults: jest.fn()
// }));

// describe("CLI", () => {
//   describe("when command is run", () => {
//     describe("when run in master", () => {
//       it("stores the results to a database", async () => {
//         console.log(await exec("npm start"));
//       });
//     });
//   });
// });
