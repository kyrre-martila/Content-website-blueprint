import type { BaseTemplateProps } from "./template-types";

export function LandingTemplate({ children }: BaseTemplateProps) {
  return <main className="stack">{children}</main>;
}
