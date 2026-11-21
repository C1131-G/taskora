import { previewWorkspaceAttachment } from "@/src/server/api/attachments/staff-attachments";
import { respondWith } from "@/src/server/api/http-response";

export const GET = async (
  request: Request,
  { params }: RouteContext<"/api/v1/workspace/attachments/[fileId]/preview">
): Promise<Response> =>
  respondWith(previewWorkspaceAttachment(request, await params));
