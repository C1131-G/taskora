import { downloadPortalAttachment } from "@/src/server/api/attachments/portal-attachments";
import { respondWith } from "@/src/server/api/http-response";

export const GET = async (
  request: Request,
  { params }: RouteContext<"/api/v1/portal/attachments/[fileId]/download">
): Promise<Response> =>
  respondWith(downloadPortalAttachment(request, await params));
