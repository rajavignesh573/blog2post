"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

import { RichTextEditor } from "@/components/shared/rich-text-editor";
import type {
  ConvertResponsePayload,
  OutputType,
  SocialPlatform,
  SourceType,
  Tone,
} from "@/types/conversion";

const OUTPUT_LABELS: Record<OutputType, string> = {
  newsletter: "Newsletter",
  social: "Social Posts",
  email: "Email Draft",
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

const TONE_LABELS: Record<Tone, string> = {
  conversational: "Conversational",
  professional: "Professional",
  playful: "Playful",
};

type OutputState = Record<OutputType, string>;

const EMPTY_OUTPUTS: OutputState = {
  newsletter: "",
  social: "",
  email: "",
};

function collectSelected<T extends string>(selection: Record<T, boolean>) {
  return (Object.keys(selection) as T[]).filter((key) => selection[key]);
}

export default function HomePage() {
  const [sourceType, setSourceType] = useState<SourceType>("url");
  const [blogUrl, setBlogUrl] = useState("");
  const [blogText, setBlogText] = useState("");
  const [manualCanonical, setManualCanonical] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [articleAuthor, setArticleAuthor] = useState("");

  const [tone, setTone] = useState<Tone>("conversational");
  const [outputSelection, setOutputSelection] = useState<Record<OutputType, boolean>>({
    newsletter: true,
    social: true,
    email: false,
  });
  const [platformSelection, setPlatformSelection] = useState<
    Record<SocialPlatform, boolean>
  >({
    twitter: true,
    linkedin: true,
    instagram: true,
  });

  const [outputs, setOutputs] = useState<OutputState>(EMPTY_OUTPUTS);
  const [metadata, setMetadata] = useState<ConvertResponsePayload["metadata"] | null>(
    null,
  );
  const [rawContentPreview, setRawContentPreview] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasGenerated = useMemo(
    () => Object.values(outputs).some((value) => value.trim().length > 0),
    [outputs],
  );

  const selectedOutputTypes = useMemo(
    () => collectSelected(outputSelection),
    [outputSelection],
  );

  const selectedPlatforms = useMemo(
    () => collectSelected(platformSelection),
    [platformSelection],
  );

  const handleToggleOutput = (type: OutputType) => {
    setOutputSelection((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleTogglePlatform = (platform: SocialPlatform) => {
    setPlatformSelection((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  const resetOutputs = () => {
    setOutputs(EMPTY_OUTPUTS);
    setMetadata(null);
    setRawContentPreview("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (selectedOutputTypes.length === 0) {
      setError("Select at least one output format to generate.");
      return;
    }

    const trimmedUrl = blogUrl.trim();
    const trimmedText = blogText.trim();

    if (sourceType === "url") {
      if (!trimmedUrl) {
        setError("Paste a blog URL first.");
        return;
      }

      try {
        new URL(trimmedUrl);
      } catch {
        setError("Enter a valid blog URL (including https://).");
        return;
      }
    } else {
      if (!trimmedText) {
        setError("Paste the blog text you'd like to repurpose.");
        return;
      }

      if (!manualCanonical.trim()) {
        setError("Provide the original blog URL so we can add backlinks.");
        return;
      }
    }

    setIsGenerating(true);
    resetOutputs();

    try {
      const payload = {
        sourceType,
        source: sourceType === "url" ? trimmedUrl : trimmedText,
        outputTypes: selectedOutputTypes,
        socialPlatforms: selectedPlatforms,
        tone,
        canonicalUrl:
          sourceType === "text" ? manualCanonical.trim() : undefined,
        articleTitle: articleTitle.trim() || undefined,
        articleAuthor: articleAuthor.trim() || undefined,
      };

      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error ??
            "The conversion failed. Please try again or adjust your input.",
        );
      }

      const result = (await response.json()) as ConvertResponsePayload;

      setOutputs((prev) => ({
        ...prev,
        ...result.outputs,
      }));
      setMetadata(result.metadata);
      setRawContentPreview(result.rawContent);
    } catch (conversionError) {
      const message =
        conversionError instanceof Error
          ? conversionError.message
          : "Something went wrong.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 pb-24 pt-16 text-zinc-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 md:px-8">
        <header className="flex flex-col gap-4 text-center md:text-left">
          <span className="inline-flex items-center justify-center self-center rounded-full bg-sky-100 px-4 py-1 text-sm font-medium uppercase tracking-wide text-sky-700 md:self-start">
            Blog2Buzz · MVP
          </span>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Turn any blog post into channel-ready buzz in seconds.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700">
            Paste a link or drop your draft, choose the formats you need, and let
            Gemini craft polished newsletters, social captions, and campaigns — each
            with traffic-driving backlinks baked in.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <form
            onSubmit={handleSubmit}
            className="flex h-fit flex-col gap-6 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-sky-100/60 backdrop-blur-md transition hover:border-sky-200"
          >
            <fieldset className="grid gap-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                Source
              </legend>
              <div className="flex flex-wrap gap-2">
                {(["url", "text"] satisfies SourceType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSourceType(type)}
                    className={clsx(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      sourceType === type
                        ? "border-sky-500 bg-sky-500 text-white shadow"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-sky-200 hover:text-sky-600",
                    )}
                  >
                    {type === "url" ? "Paste blog URL" : "Paste blog text"}
                  </button>
                ))}
              </div>

              {sourceType === "url" ? (
                <input
                  type="url"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base shadow-sm focus:border-sky-500 focus:outline-none focus:ring focus:ring-sky-100"
                  placeholder="https://your-blog.com/latest-story"
                  value={blogUrl}
                  onChange={(event) => setBlogUrl(event.target.value)}
                  required
                />
              ) : (
                <textarea
                  className="min-h-[200px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base leading-relaxed shadow-sm focus:border-sky-500 focus:outline-none focus:ring focus:ring-sky-100"
                  placeholder="Paste the full blog article text here…"
                  value={blogText}
                  onChange={(event) => setBlogText(event.target.value)}
                  required
                />
              )}
            </fieldset>

            {sourceType === "text" && (
              <div className="grid gap-4 rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 p-4">
                <p className="text-sm font-medium text-sky-700">
                  Add a few details so we can craft accurate backlinks.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Original URL
                    </label>
                    <input
                      type="url"
                      className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring focus:ring-sky-100"
                      placeholder="https://your-blog.com/story"
                      value={manualCanonical}
                      onChange={(event) => setManualCanonical(event.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Article title (optional)
                    </label>
                    <input
                      type="text"
                      className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring focus:ring-sky-100"
                      placeholder="Title of the article"
                      value={articleTitle}
                      onChange={(event) => setArticleTitle(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Author (optional)
                    </label>
                    <input
                      type="text"
                      className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring focus:ring-sky-100"
                      placeholder="Author name"
                      value={articleAuthor}
                      onChange={(event) => setArticleAuthor(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <fieldset className="grid gap-4">
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                Output formats
              </legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(OUTPUT_LABELS) as OutputType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleToggleOutput(type)}
                    className={clsx(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      outputSelection[type]
                        ? "border-emerald-500 bg-emerald-500 text-white shadow"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:text-emerald-600",
                    )}
                  >
                    {OUTPUT_LABELS[type]}
                  </button>
                ))}
              </div>

              {outputSelection.social && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    Social platforms
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map(
                      (platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => handleTogglePlatform(platform)}
                          className={clsx(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            platformSelection[platform]
                              ? "border-emerald-500 bg-white text-emerald-700 shadow"
                              : "border-emerald-200 bg-white/70 text-emerald-600 hover:border-emerald-400",
                          )}
                        >
                          {PLATFORM_LABELS[platform]}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                Tone
              </legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TONE_LABELS) as Tone[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTone(option)}
                    className={clsx(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      tone === option
                        ? "border-sky-500 bg-white text-sky-700 shadow"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-sky-200 hover:text-sky-600",
                    )}
                  >
                    {TONE_LABELS[option]}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              {isGenerating ? "Generating…" : "Convert with Gemini"}
            </button>

            <p className="text-xs text-zinc-500">
              Powered by Gemini 1.5 Flash. Outputs are editable — polish them in
              seconds before sharing.
            </p>
          </form>

          <aside className="flex flex-col gap-4 rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl shadow-sky-100/60 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-zinc-900">
              How Blog2Buzz works
            </h2>
            <dl className="space-y-4 text-sm text-zinc-600">
              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <dt className="font-semibold text-zinc-800">1. Extract</dt>
                <dd>
                  We pull the readable portion of your blog — title, author, and
                  canonical URL included.
                </dd>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <dt className="font-semibold text-zinc-800">2. Repurpose</dt>
                <dd>
                  Gemini remixes the story for each channel with tone and platform
                  guardrails so it stays on-brand.
                </dd>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <dt className="font-semibold text-zinc-800">3. Publish</dt>
                <dd>
                  Edit in place with our rich text editor, then copy, download, or
                  email the results — backlinks ready to go.
                </dd>
              </div>
            </dl>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
              <p className="font-semibold">Need to keep score?</p>
              <p>
                Future releases will add history, scheduling, and analytics. For now,
                focus on crafting standout shareable summaries.
              </p>
            </div>
          </aside>
        </section>

        {isGenerating && (
          <div className="flex items-center gap-3 rounded-3xl border border-dashed border-sky-200 bg-white/80 px-6 py-4 text-sm text-sky-700">
            <span className="h-3 w-3 animate-ping rounded-full bg-sky-500" />
            Gemini is remixing your content…
          </div>
        )}

        {hasGenerated && (
          <section className="grid gap-6">
            {metadata && (
              <article className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-lg shadow-sky-100/50">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Source snapshot
                </h2>
                <dl className="mt-4 grid gap-3 text-sm text-zinc-600 md:grid-cols-3">
                  {metadata.title && (
                    <div>
                      <dt className="font-semibold text-zinc-800">Title</dt>
                      <dd>{metadata.title}</dd>
                    </div>
                  )}
                  {metadata.author && (
                    <div>
                      <dt className="font-semibold text-zinc-800">Author</dt>
                      <dd>{metadata.author}</dd>
                    </div>
                  )}
                  {metadata.wordCount && (
                    <div>
                      <dt className="font-semibold text-zinc-800">Approx. words</dt>
                      <dd>~{metadata.wordCount.toLocaleString()}</dd>
                    </div>
                  )}
                  <div className="md:col-span-3">
                    <dt className="font-semibold text-zinc-800">Canonical URL</dt>
                    <dd>
                      <a
                        href={metadata.canonicalUrl}
                        className="text-sky-600 underline underline-offset-2"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {metadata.canonicalUrl}
                      </a>
                    </dd>
                  </div>
                </dl>
                {rawContentPreview && (
                  <details className="mt-4 text-sm text-zinc-600">
                    <summary className="cursor-pointer text-sky-600">
                      Peek at extracted text
                    </summary>
                    <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-500">
                      {rawContentPreview.slice(0, 2000)}
                      {rawContentPreview.length > 2000 && "…"}
                    </p>
                  </details>
                )}
              </article>
            )}

            {(Object.keys(outputs) as OutputType[]).map((type) => {
              if (!selectedOutputTypes.includes(type)) {
                return null;
              }

              const value = outputs[type];
              return (
                <OutputCard
                  key={type}
                  type={type}
                  label={OUTPUT_LABELS[type]}
                  value={value}
                  onChange={(html) =>
                    setOutputs((prev) => ({
                      ...prev,
                      [type]: html,
                    }))
                  }
                  metadata={metadata}
                />
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}

interface OutputCardProps {
  type: OutputType;
  label: string;
  value: string;
  onChange: (html: string) => void;
  metadata: ConvertResponsePayload["metadata"] | null;
}

function OutputCard({ type, label, value, onChange, metadata }: OutputCardProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op
    }
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blog2buzz-${type}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleEmail = () => {
    const subject = metadata?.title
      ? `Draft: ${metadata.title}`
      : "Blog2Buzz draft content";
    const body = value
      .replace(/<[^>]+>/g, "")
      .replace(/\s+\n/g, "\n")
      .trim();
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
  };

  return (
    <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-emerald-100/50 backdrop-blur-md">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-zinc-900">{label}</h3>
          <p className="text-sm text-zinc-500">
            Edit directly below, then copy, download, or email the final draft.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-sky-300 hover:text-sky-600"
          >
            Copy HTML
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-600"
          >
            Download
          </button>
          <button
            type="button"
            onClick={handleEmail}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-amber-300 hover:text-amber-600"
          >
            Send to email
          </button>
        </div>
      </header>

      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder="Generated content will appear here."
      />
    </article>
  );
}

