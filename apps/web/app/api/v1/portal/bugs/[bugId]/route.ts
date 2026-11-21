import { getPortalBug } from "@/src/server/api/bugs/portal-bugs";
import { respondWith } from "@/src/server/api/http-response";

export const GET = async (
  request: Request,
  { params }: RouteContext<"/api/v1/portal/bugs/[bugId]">
): Promise<Response> => respondWith(getPortalBug(request, await params));
