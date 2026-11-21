import { finalizeWorkspaceUpload } from "@/src/server/api/attachments/staff-attachments";
import { respondWith } from "@/src/server/api/http-response";

export const POST = async (
  request: Request,
  { params }: RouteContext<"/api/v1/workspace/attachments/uploads/[uploadIntentId]/finalize">
): Promise<Response> =>
  respondWith(finalizeWorkspaceUpload(request, await params));
