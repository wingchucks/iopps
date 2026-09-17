import { AssignmentError, applyAssignment, parseAssignmentRequest, reviewAssignment, type AssignmentDesired, type AssignmentStore } from "./organization-admin-assignment.ts";
interface Deps {
  authorize(): Promise<{actor:string} | {response:Response}>;
  getStore(desired: AssignmentDesired): AssignmentStore;
  getSecret(): string;
}
export async function handleAssignmentRequest(request: Request, orgId: string, deps: Deps): Promise<Response> {
  const json = (body: unknown, status = 200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
  try {
    const auth = await deps.authorize();
    if ("response" in auth) {
      auth.response.headers.set("Cache-Control","no-store");
      return auth.response;
    }
    const input = await parseAssignmentRequest(request,orgId);
    const secret = deps.getSecret();
    if (Buffer.byteLength(secret) < 32) throw new AssignmentError("Organization administrator review is not configured",503);
    const store = deps.getStore(input);
    const options = {actor:auth.actor,secret};
    return json(input.action === "review" ? await reviewAssignment(input,store,options) : await applyAssignment(input,store,options));
  } catch (error) {
    if (error instanceof AssignmentError) return json({error:error.message},error.status);
    return json({error:"Assignment could not be verified. Retry the same confirmation or request a new review after inspection."},500);
  }
}
