import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

import type { BlogMetadata } from "@/types/conversion";

export interface ExtractedArticle {
  content: string;
  metadata: BlogMetadata;
  html: string;
}

interface CanonicalResult {
  href: string;
  source: "link" | "og" | "twitter" | "input";
}

function resolveCanonical(url: string, href: string | null | undefined): string {
  if (!href) {
    return url;
  }

  try {
    return new URL(href, url).toString();
  } catch {
    return url;
  }
}

function getCanonical(doc: Document, url: string): CanonicalResult {
  const linkEl = doc.querySelector<HTMLLinkElement>("link[rel='canonical']");
  if (linkEl?.href) {
    return { href: resolveCanonical(url, linkEl.href), source: "link" };
  }

  const ogUrl = doc
    .querySelector<HTMLMetaElement>("meta[property='og:url']")
    ?.getAttribute("content");
  if (ogUrl) {
    return { href: resolveCanonical(url, ogUrl), source: "og" };
  }

  const twitterUrl = doc
    .querySelector<HTMLMetaElement>("meta[name='twitter:url']")
    ?.getAttribute("content");
  if (twitterUrl) {
    return { href: resolveCanonical(url, twitterUrl), source: "twitter" };
  }

  return { href: url, source: "input" };
}

export async function extractArticleFromUrl(url: string): Promise<ExtractedArticle> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Blog2BuzzBot/1.0 (+https://blog2buzz.app; contact@blog2buzz.app)",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch content. Received status ${response.status} (${response.statusText}).`,
    );
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  const reader = new Readability(doc);
  const article = reader.parse();

  const textContent =
    article?.textContent?.trim() ??
    doc.body.textContent?.replace(/\s+/g, " ").trim() ??
    "";

  if (!textContent) {
    throw new Error("We couldn't extract readable content from this URL.");
  }

  const canonical = getCanonical(doc, url);

  const metadata: BlogMetadata = {
    title: article?.title ?? doc.title ?? undefined,
    author: article?.byline ?? undefined,
    canonicalUrl: canonical.href,
    wordCount: article?.length ? Math.round(article.length / 5) : undefined,
    excerpt: article?.excerpt ?? undefined,
  };

  return {
    content: textContent,
    metadata,
    html,
  };
}

