import { addWorkspaceBugComment } from "@/src/server/api/bugs/staff-bug-comments";
import { respondWith } from "@/src/server/api/http-response";

export const POST = async (
  request: Request,
  { params }: RouteContext<"/api/v1/workspace/bugs/[bugId]/comments">
): Promise<Response> =>
  respondWith(addWorkspaceBugComment(request, await params));
