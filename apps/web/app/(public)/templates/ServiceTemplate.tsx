import type { BaseTemplateProps } from "./template-types";

export function ServiceTemplate({ children, title }: BaseTemplateProps) {
  return (
    <article className="stack">
      {title ? <h1 className="public-block__title">{title}</h1> : null}
      {children}
    </article>
  );
}
