import { confirmPortalBugFix } from "@/src/server/api/bugs/portal-bugs";
import { respondWith } from "@/src/server/api/http-response";

export const POST = async (
  request: Request,
  { params }: RouteContext<"/api/v1/portal/bugs/[bugId]/confirm">
): Promise<Response> => respondWith(confirmPortalBugFix(request, await params));
