// What the browser receives. No storage paths, no owner ids.

export type GenerationSummary = {
  id: string;
  prompt: string;
  modelId: string;
  mode: string;
  aspectRatio: string | null;
  imageSize: string | null;
  count: number;
  costUsd: number | null; // null = unknown
};

export type AssetDto = {
  id: string;
  kind: "image" | "video";
  source: "generated" | "upload";
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  isFavorite: boolean;
  createdAt: string;
  generation: GenerationSummary | null;
};

export type LibraryPage = { items: AssetDto[]; nextCursor: string | null };

export type ReRunSettings = {
  prompt: string;
  model: "default" | "pro" | "fast";
  aspectRatio: string;
  imageSize: string;
  count: number;
  references: AssetDto[];
};
