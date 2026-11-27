import { requireUser, authFail } from "../auth";
import { contestBoard } from "../contest";

/** The biweekly contest board. Verified people only, ranked, with the prizes. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return Response.json(await contestBoard(user));
  } catch (e) { return authFail(e); }
}
