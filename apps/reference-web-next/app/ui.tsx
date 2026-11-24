import type { ReactNode } from "react";

// The app's layout, shared by its Server and Client Components. Every value is a theme token or
// a shadcn/ui color name that the theme maps.

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-(--rc-space-2)">
      <h2 className="m-0 text-(length:--rc-type-body-sm-font-size) font-(--rc-type-body-sm-font-weight) text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-(--rc-space-4)">{children}</div>;
}

export function Column({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-start gap-(--rc-space-3)">{children}</div>;
}
