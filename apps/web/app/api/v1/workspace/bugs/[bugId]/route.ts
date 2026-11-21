import { getWorkspaceBug } from "@/src/server/api/bugs/staff-bug-context";
import { respondWith } from "@/src/server/api/http-response";

export const GET = async (
  request: Request,
  { params }: RouteContext<"/api/v1/workspace/bugs/[bugId]">
): Promise<Response> => respondWith(getWorkspaceBug(request, await params));
