import { ViewTransition, type ReactNode } from "react";

// The same photo on two pages morphs between them. Names must be unique per page.
export default function PhotoMorph({ imageId, children }: { imageId: string; children: ReactNode }) {
  return (
    <ViewTransition name={`photo-${imageId}`} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
