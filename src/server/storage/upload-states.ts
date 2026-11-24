import { Schema } from "effect";

// The one list of upload intent states. It matches the database CHECK
// `upload_state_valid`: an upload that cannot finish is
// removed, and a failed copy shows on the file's own copy state.
const UploadIntentStateSchema = Schema.Literals([
  "pending",
  "finalized",
  "removed",
]);
export type UploadIntentState = typeof UploadIntentStateSchema.Type;

// The one list of file copy states. It matches the database CHECK
// `file_asset_copy_state_valid_08b2bfa7`.
export const FileCopyStateSchema = Schema.Literals([
  "pending",
  "ready",
  "failed",
]);
export type FileCopyState = typeof FileCopyStateSchema.Type;

// Database rows type these columns as plain strings; decode them before a
// comparison so a misspelled state fails to compile instead of never matching.
export const decodeUploadIntentState = Schema.decodeUnknownSync(
  UploadIntentStateSchema
);
export const decodeFileCopyState =
  Schema.decodeUnknownSync(FileCopyStateSchema);
