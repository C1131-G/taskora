import { finalizePortalUpload } from "@/src/server/api/attachments/portal-attachments";
import { respondWith } from "@/src/server/api/http-response";

export const POST = async (
  request: Request,
  { params }: RouteContext<"/api/v1/portal/attachments/uploads/[uploadIntentId]/finalize">
): Promise<Response> =>
  respondWith(finalizePortalUpload(request, await params));
