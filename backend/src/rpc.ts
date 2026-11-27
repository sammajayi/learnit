import { custom, http, type Transport } from "viem";

/**
 * A blockchain transport that always reads from the node that is furthest ahead.
 *
 * The public nodes behind a free RPC address are not always at the same block. A node a block or two behind (or much more) answers with
 * the chain as it was: a challenge that has settled still looks running, a claim just made still looks open, a vote not yet counted. The old
 * setup used the first node that answered, however far behind it was. This one asks every node for its latest block (cached for a few
 * seconds), sends the request to the highest, and falls back down the list only when a node cannot be reached.
 */
const PROBE_TTL_MS = 3_000;
const PROBE_TIMEOUT_MS = 2_500;

/** Node indexes, furthest ahead first. Ties keep the order given (so the preferred node wins), and a node that did not answer goes last. */
export function orderByFreshness(blocks: (bigint | null)[]): number[] {
  return blocks
    .map((b, i) => ({ b, i }))
    .sort((x, y) => (x.b === null ? 1 : y.b === null ? -1 : x.b === y.b ? x.i - y.i : x.b > y.b ? -1 : 1))
    .map((x) => x.i);
}

/** An error that is the node's answer to the request (a reverted call, a bad argument), not a failure to reach it. Another node would say the same, so it is thrown on. */
export function isAnswer(e: unknown) {
  const name = (e as { name?: string })?.name;
  return name === "RpcRequestError" || name === "ContractFunctionRevertedError" || name === "ExecutionRevertedError";
}

const within = <T,>(p: Promise<T>, ms: number) => new Promise<T>((res, rej) => { const t = setTimeout(() => rej(new Error("probe timeout")), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });

export function freshestTransport(urls: string[]): Transport {
  return (args) => {
    // no-store: a request that goes out is never answered from a cache.
    const nodes = urls.map((u) => http(u, { timeout: 6_000, retryCount: 0, fetchOptions: { cache: "no-store" } })({ ...args, retryCount: 0 }));
    let ranking: { order: number[]; at: number } | null = null;
    let probing: Promise<number[]> | null = null;

    const rank = (): Promise<number[]> => {
      if (ranking && Date.now() - ranking.at < PROBE_TTL_MS) return Promise.resolve(ranking.order);
      probing ??= Promise.all(nodes.map((n) => within(n.request({ method: "eth_blockNumber" }) as Promise<string>, PROBE_TIMEOUT_MS).then((h) => BigInt(h), () => null)))
        .then((blocks) => { const order = orderByFreshness(blocks); ranking = { order, at: Date.now() }; return order; })
        .finally(() => { probing = null; });
      return probing;
    };

    return custom({
      async request({ method, params }) {
        let last: unknown;
        for (const i of await rank()) {
          try { return await nodes[i].request({ method, params } as never); }
          catch (e) { if (isAnswer(e)) throw e; last = e; ranking = null; } // could not reach this one: try the next, and look again next time
        }
        throw last;
      },
    })(args);
  };
}
