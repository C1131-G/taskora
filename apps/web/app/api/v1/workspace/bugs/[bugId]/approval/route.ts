import { submitBugApproval } from "@/src/server/api/bugs/staff-bugs";
import { respondWith } from "@/src/server/api/http-response";

export const POST = async (
  request: Request,
  { params }: RouteContext<"/api/v1/workspace/bugs/[bugId]/approval">
): Promise<Response> => respondWith(submitBugApproval(request, await params));
