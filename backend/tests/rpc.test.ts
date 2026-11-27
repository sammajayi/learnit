import { describe, it, expect } from "vitest";
import { isAnswer, orderByFreshness } from "../src/rpc";

describe("orderByFreshness: read from the node that is furthest ahead", () => {
  it("puts the highest block first", () => {
    expect(orderByFreshness([100n, 103n, 101n])).toEqual([1, 2, 0]);
  });
  it("keeps the preferred order between nodes at the same block", () => {
    expect(orderByFreshness([100n, 100n, 100n])).toEqual([0, 1, 2]);
  });
  it("puts a node that did not answer last, and still uses the rest", () => {
    expect(orderByFreshness([null, 90n, 95n])).toEqual([2, 1, 0]);
    expect(orderByFreshness([null, null, null])).toEqual([0, 1, 2]);
  });
  it("a node far behind is never first while another is ahead", () => {
    expect(orderByFreshness([5_000n, 83_805_000n, 83_805_002n])[0]).toBe(2);
  });
});

describe("isAnswer: tell the node's answer from a node that cannot be reached", () => {
  it("treats a reverted call as an answer, so it is not retried on every node", () => {
    expect(isAnswer({ name: "RpcRequestError" })).toBe(true);
    expect(isAnswer({ name: "ContractFunctionRevertedError" })).toBe(true);
  });
  it("treats a timeout or a network failure as a reason to try the next node", () => {
    expect(isAnswer({ name: "TimeoutError" })).toBe(false);
    expect(isAnswer({ name: "HttpRequestError" })).toBe(false);
    expect(isAnswer(new Error("fetch failed"))).toBe(false);
  });
});
