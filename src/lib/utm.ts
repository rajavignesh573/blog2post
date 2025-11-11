import type { OutputType } from "@/types/conversion";

const UTM_SOURCE = "blog2buzz";
const UTM_CAMPAIGN = "content-repurpose";

export function buildTrackedUrl(
  href: string,
  medium: OutputType,
  overrideParams?: Record<string, string>,
) {
  const url = new URL(href);
  url.searchParams.set("utm_source", UTM_SOURCE);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", UTM_CAMPAIGN);

  if (overrideParams) {
    Object.entries(overrideParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

