import { ViewTransition, type ReactNode } from "react";

// Route changes fade the old page out and lift the new one in. Layouts persist
// across navigations, so each page wraps itself.
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
