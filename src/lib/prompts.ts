import type {
  BlogMetadata,
  OutputType,
  SocialPlatform,
  Tone,
} from "@/types/conversion";

interface PromptBuilderOptions {
  outputType: OutputType;
  blogText: string;
  metadata: BlogMetadata;
  platforms?: SocialPlatform[];
  tone?: Tone;
}

const toneGuidance: Record<Tone, string> = {
  conversational:
    "Adopt a warm, conversational tone with clear transitions and short paragraphs.",
  professional:
    "Use a confident, professional voice with crisp sentences and thoughtful structure.",
  playful:
    "Lean into an upbeat, playful tone that still communicates the core ideas clearly.",
};

const outputToneFallback =
  "Default to a friendly, confident tone that is easy to skim.";

const SOCIAL_PLATFORM_DESCRIPTIONS: Record<SocialPlatform, string> = {
  twitter:
    "Create a concise thread style update using plain language, emojis, and up to two relevant hashtags. Keep each Tweet under 250 characters.",
  linkedin:
    "Write a short LinkedIn caption that highlights the key takeaway and invites discussion. Use 2-3 professional yet friendly sentences and add one relevant hashtag.",
  instagram:
    "Draft an Instagram caption with an engaging hook, a short summary in 2-3 sentences, and a strong call-to-action emoji. Include 2-3 short hashtags.",
};

function buildBacklinkInstruction(metadata: BlogMetadata) {
  const anchor = `<a href="${metadata.canonicalUrl}" rel="noopener noreferrer">Read the full article</a>`;
  return anchor.replace('">', `" data-utm="true">`);
}

export function buildPrompt({
  outputType,
  blogText,
  metadata,
  platforms = ["twitter", "linkedin", "instagram"],
  tone = "conversational",
}: PromptBuilderOptions) {
  const backlinkAnchor = buildBacklinkInstruction(metadata);

  const sharedContext = [
    "You are Blog2Buzz, an AI writing assistant that repurposes blog posts into channel-ready formats.",
    "The generated content must stand alone, read naturally, and entice readers to click back to the source article.",
    `Original article title: ${metadata.title ?? "Untitled"}.`,
    metadata.author ? `Primary author: ${metadata.author}.` : "",
    metadata.excerpt
      ? `Key excerpt from the article: ${metadata.excerpt}`
      : "",
    `Total word count (approximate): ${metadata.wordCount ?? "unknown"}.`,
    tone ? toneGuidance[tone] : outputToneFallback,
    `Always embed this backlink exactly once in the most natural spot: ${backlinkAnchor}.`,
    "Do not invent facts. If a detail is missing in the source text, skip it.",
  ]
    .filter(Boolean)
    .join("\n");

  switch (outputType) {
    case "newsletter": {
      return `${sharedContext}

Generate HTML for a newsletter update that includes:
- A warm intro framing why this article matters.
- 2-3 short paragraphs that summarize the key insights without repeating the entire article.
- A bulleted list of 3 sharp takeaways or action items.
- A closing sentence that nudges readers to explore more, followed immediately by the backlink anchor.

Formatting rules:
- Use semantic HTML (<article>, <h2>, <p>, <ul>, <li>, <strong>).
- Keep paragraphs under 60 words.
- Never include placeholder text.

Backlink anchor to insert: ${backlinkAnchor}

Source article content:
${blogText}`;
    }
    case "email": {
      return `${sharedContext}

Generate HTML for a marketing email snippet ready to drop into a campaign tool. Requirements:
- Subject line suggestion in a <p data-role="subject"> element (max 55 characters).
- Preheader suggestion in a <p data-role="preheader"> element (max 90 characters).
- Body content inside a <section data-role="body"> wrapping:
  - A friendly greeting.
  - 2 concise paragraphs covering the core narrative.
  - A short bulleted or numbered list of the main highlights.
  - A single call-to-action button (<a> styled inline) that uses the backlink anchor.
- An optional postscript (<p data-role="ps">) if there's a timely hook.

Favor approachable, professional language that still feels personal.

Backlink anchor to insert inside the CTA button: ${backlinkAnchor}

Source article content:
${blogText}`;
    }
    case "social": {
      const platformGuidance = platforms
        .map(
          (platform) =>
            `For ${platform.toUpperCase()}:\n${SOCIAL_PLATFORM_DESCRIPTIONS[platform]}`,
        )
        .join("\n\n");
      return `${sharedContext}

Generate HTML that contains a <section> element for each requested platform. Each section must have:
- data-platform attribute set to the platform name (twitter, linkedin, instagram).
- A <h3> heading naming the platform.
- A <p> with the suggested copy.
- The backlink anchor appended at the end of the copy, using natural connective text (e.g., "Read more").

Platform-specific rules:
${platformGuidance}

Always keep emoji use relevant and tasteful.
Never repeat the exact same wording across platforms.

Backlink anchor to include in each section: ${backlinkAnchor}

Source article content:
${blogText}`;
    }
    default: {
      const exhaustiveCheck: never = outputType;
      return exhaustiveCheck;
    }
  }
}

