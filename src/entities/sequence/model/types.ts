export interface SequenceMeta {
  name: string;
  description: string;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface SequenceSelectors {
  media: string;
  folder_name: string | null;
  file_name: string | null;
}

export interface SequenceNaming {
  folder: string;
  folder_source: "literal" | "selector";
  file: string;
  file_source: "pattern" | "selector";
}

export interface Sequence {
  version: string;
  meta: SequenceMeta;
  url_pattern: string;
  selectors: SequenceSelectors;
  naming: SequenceNaming;
}
