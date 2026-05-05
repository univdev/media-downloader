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
}

export interface SequenceNaming {
  folder: string;
  folder_source: "literal" | "selector";
}

export interface Sequence {
  version: string;
  meta: SequenceMeta;
  url_pattern: string;
  match_patterns?: string[];
  crawl_url_pattern?: string | null;
  media_url_pattern: string | null;
  selectors: SequenceSelectors;
  naming: SequenceNaming;
}
