import type {
  FileSort,
  ProjectFile,
} from "@/features/files/types/project-file-types";

// The content types present in the files, sorted, for the type filter.
export const listFileTypes = (files: readonly ProjectFile[]): string[] =>
  [...new Set(files.map(({ contentType }) => contentType))].toSorted(
    (left, right) => left.localeCompare(right)
  );

export const filterProjectFiles = (
  files: readonly ProjectFile[],
  query: string,
  typeFilter: string,
  sort: FileSort
) => {
  const fileTypes = listFileTypes(files);
  const filteredFiles = files
    .filter((file) => {
      const matchesQuery = `${file.originalName} ${file.contentType}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase());
      const matchesType =
        typeFilter === "all" || file.contentType === typeFilter;
      return matchesQuery && matchesType;
    })
    .toSorted((left, right) => {
      if (sort === "name") {
        return left.originalName.localeCompare(right.originalName);
      }
      if (sort === "size") {
        return right.sizeBytes - left.sizeBytes;
      }
      const dateOrder = left.createdAt.localeCompare(right.createdAt);
      return sort === "newest" ? -dateOrder : dateOrder;
    });
  return { fileTypes, filteredFiles };
};
