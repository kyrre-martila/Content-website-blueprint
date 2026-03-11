import type { BaseTemplateProps } from "./template-types";

export function NewsTemplate({ children, title, meta }: BaseTemplateProps) {
  return (
    <article className="public-block section stack">
      {meta ? <p className="news-list__meta">{meta}</p> : null}
      {title ? <h1 className="public-block__title">{title}</h1> : null}
      {children}
    </article>
  );
}
