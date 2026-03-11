import type { BaseTemplateProps } from "./template-types";

export function IndexTemplate({ children }: BaseTemplateProps) {
  return <article className="stack">{children}</article>;
}
