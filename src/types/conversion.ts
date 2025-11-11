export type OutputType = "newsletter" | "social" | "email";

export type SourceType = "url" | "text";

export type SocialPlatform = "twitter" | "linkedin" | "instagram";

export type Tone = "conversational" | "professional" | "playful";

export interface BlogMetadata {
  title?: string;
  author?: string;
  canonicalUrl: string;
  wordCount?: number;
  excerpt?: string;
}

export interface ConvertRequestPayload {
  sourceType: SourceType;
  source: string;
  outputTypes: OutputType[];
  socialPlatforms?: SocialPlatform[];
  tone?: Tone;
  canonicalUrl?: string;
  articleTitle?: string;
  articleAuthor?: string;
}

export interface ConvertResponsePayload {
  outputs: Partial<Record<OutputType, string>>;
  metadata: BlogMetadata;
  rawContent: string;
}

