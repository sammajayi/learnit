import { PrismaClient as NodePrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Neon's pooled URL goes through PgBouncer (transaction mode). Connections can take several seconds to open
 * (an idle compute waking up), so the connect timeout is wide.
 */
function adapter() {
  return new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 30_000, max: 5 });
}

const workerRequest = () => (globalThis as unknown as Record<symbol, { ctx?: object } | undefined>)[Symbol.for("__cloudflare-context__")]?.ctx;

/** Short-lived cache of user rows so auth does not cost a database round trip on every request. Cleared on any user write. */
export const userCache = new Map<string, { at: number; user: import("@prisma/client").User }>();

/** Workers cannot read the engine from disk, so there Prisma is loaded from its wasm build instead. */
function prismaClass(): typeof NodePrismaClient {
  return workerRequest() ? require("@prisma/client/wasm").PrismaClient : NodePrismaClient;
}

function create() {
  const PrismaClient = prismaClass();
  return new PrismaClient({ adapter: adapter() }).$extends({
    query: {
      user: {
        async $allOperations({ operation, args, query }) {
          const r = await query(args);
          if (/^(create|update|upsert|delete)/.test(operation)) userCache.clear();
          return r;
        },
      },
    },
  });
}
type Client = ReturnType<typeof create>;

/**
 * On Cloudflare Workers a socket belongs to the request that opened it and cannot be reused by the next one,
 * so each request gets its own client (the runtime exposes the request context under this symbol).
 * Everywhere else (Node, local dev, scripts) one client is shared.
 */
const perRequest = new WeakMap<object, Client>();
const g = globalThis as unknown as { prisma?: Client };

function current(): Client {
  const ctx = workerRequest();
  if (ctx) {
    let c = perRequest.get(ctx);
    if (!c) { c = create(); perRequest.set(ctx, c); }
    return c;
  }
  return (g.prisma ??= create());
}

export const db: Client = new Proxy({} as Client, {
  get: (_t, prop) => {
    const c = current();
    const v = Reflect.get(c, prop, c);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
