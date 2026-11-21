import { addPortalBugComment } from "@/src/server/api/bugs/portal-bugs";
import { respondWith } from "@/src/server/api/http-response";

export const POST = async (
  request: Request,
  { params }: RouteContext<"/api/v1/portal/bugs/[bugId]/comments">
): Promise<Response> => respondWith(addPortalBugComment(request, await params));
