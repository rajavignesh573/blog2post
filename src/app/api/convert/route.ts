import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { extractArticleFromUrl } from "@/lib/extract";
import { buildPrompt } from "@/lib/prompts";
import { buildTrackedUrl } from "@/lib/utm";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type {
  BlogMetadata,
  ConvertResponsePayload,
  OutputType,
  SocialPlatform,
  Tone,
} from "@/types/conversion";

export const runtime = "nodejs";

const REQUEST_SCHEMA = z.object({
  sourceType: z.enum(["url", "text"]),
  source: z.string().min(1, "Provide a blog URL or the article text."),
  outputTypes: z
    .array(z.enum(["newsletter", "social", "email"]))
    .min(1, "Select at least one output format."),
  socialPlatforms: z
    .array(z.enum(["twitter", "linkedin", "instagram"]))
    .optional(),
  tone: z.enum(["conversational", "professional", "playful"]).optional(),
  canonicalUrl: z.string().url().optional(),
  articleTitle: z.string().optional(),
  articleAuthor: z.string().optional(),
});

const DEFAULT_PLATFORMS: SocialPlatform[] = [
  "twitter",
  "linkedin",
  "instagram",
];

const DEFAULT_TONE: Tone = "conversational";

interface PersistConversionArgs {
  sourceType: "url" | "text";
  tone: Tone;
  outputTypes: OutputType[];
  platforms: SocialPlatform[];
  metadata: BlogMetadata;
  outputs: ConvertResponsePayload["outputs"];
  content: string;
}

async function persistConversion({
  sourceType,
  tone,
  outputTypes,
  platforms,
  metadata,
  outputs,
  content,
}: PersistConversionArgs) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("conversions").insert({
    source_type: sourceType,
    tone,
    output_types: outputTypes,
    social_platforms: platforms,
    canonical_url: metadata.canonicalUrl,
    article_title: metadata.title ?? null,
    article_author: metadata.author ?? null,
    outputs,
    raw_content: content,
    metadata,
  });

  if (error) {
    console.error("[convert] Failed to persist conversion", error);
  }
}

function sanitizeModelHtml(output: string, canonicalUrl: string) {
  const cleaned = output
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .replace(/\u200b/g, "")
    .trim();

  if (!cleaned) {
    return `<p>We weren't able to generate this output. Please try again.</p>`;
  }

  if (!cleaned.includes(canonicalUrl)) {
    return `${cleaned}\n<p><a href="${canonicalUrl}">Read the full article</a></p>`;
  }

  return cleaned;
}

function ensureApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing. Add GEMINI_API_KEY to your environment.",
    );
  }
  return apiKey;
}

async function generateOutput(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  outputType: OutputType,
  prompt: string,
  canonical: string,
) {
  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const text = response.response.text();
  return sanitizeModelHtml(text, canonical);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = REQUEST_SCHEMA.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message);
      return NextResponse.json(
        { error: "Invalid input.", details: issues },
        { status: 400 },
      );
    }

    const {
      sourceType,
      source,
      outputTypes,
      socialPlatforms,
      tone,
      canonicalUrl,
      articleAuthor,
      articleTitle,
    } = parsed.data;

    let content = "";
    let metadata: BlogMetadata;

    if (sourceType === "url") {
      const article = await extractArticleFromUrl(source);
      content = article.content;
      metadata = article.metadata;
    } else {
      content = source;
      const resolvedCanonical = canonicalUrl;
      if (!resolvedCanonical) {
        return NextResponse.json(
          {
            error:
              "Provide the original blog URL so we can add a backlink when pasting raw text.",
          },
          { status: 400 },
        );
      }

      metadata = {
        title: articleTitle,
        author: articleAuthor,
        canonicalUrl: resolvedCanonical,
      };
    }

    metadata = {
      ...metadata,
      title: articleTitle ?? metadata.title,
      author: articleAuthor ?? metadata.author,
    };

    const apiKey = ensureApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    });

    const platforms = socialPlatforms?.length
      ? (Array.from(new Set(socialPlatforms)) as SocialPlatform[])
      : DEFAULT_PLATFORMS;

    const outputs: ConvertResponsePayload["outputs"] = {};

    for (const outputType of outputTypes) {
      const trackedCanonical = buildTrackedUrl(metadata.canonicalUrl, outputType);
      const prompt = buildPrompt({
        outputType,
        blogText: content,
        metadata: {
          ...metadata,
          canonicalUrl: trackedCanonical,
        },
        platforms,
        tone: tone ?? DEFAULT_TONE,
      });

      const html = await generateOutput(model, outputType, prompt, trackedCanonical);
      outputs[outputType] = html;
    }

    const responsePayload: ConvertResponsePayload = {
      outputs,
      metadata,
      rawContent: content,
    };

    await persistConversion({
      sourceType,
      tone: tone ?? DEFAULT_TONE,
      outputTypes,
      platforms,
      metadata,
      outputs,
      content,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[convert] Error", error);
    const message =
      error instanceof Error ? error.message : "Unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

