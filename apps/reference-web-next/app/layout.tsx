import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raincoat reference app (Next.js)",
};

// The page's own colors use the shadcn/ui names that @raincoat-ui/react/tailwind.css maps onto
// the theme, so they follow its color modes like the components do.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="m-0 bg-background font-(family-name:--rc-type-body-md-font-family) text-(length:--rc-type-body-md-font-size) leading-(--rc-type-body-md-line-height) text-foreground">
        {children}
      </body>
    </html>
  );
}
