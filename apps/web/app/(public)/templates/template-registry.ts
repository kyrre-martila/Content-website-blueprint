import { IndexTemplate } from "./IndexTemplate";
import { LandingTemplate } from "./LandingTemplate";
import { NewsTemplate } from "./NewsTemplate";
import { ServiceTemplate } from "./ServiceTemplate";

export type TemplateKey = "index" | "service" | "news" | "landing";

export const templateRegistry = {
  index: IndexTemplate,
  service: ServiceTemplate,
  news: NewsTemplate,
  landing: LandingTemplate,
} as const;

export function resolveTemplate(
  templateKey: string | null | undefined,
): (typeof templateRegistry)[TemplateKey] {
  if (!templateKey) {
    return templateRegistry.index;
  }

  return templateRegistry[templateKey as TemplateKey] ?? templateRegistry.index;
}
