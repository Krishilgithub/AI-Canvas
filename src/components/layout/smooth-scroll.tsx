"use client";

import { ReactLenis } from "@studio-freight/react-lenis";
import { ReactNode } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LenisWrapper = ReactLenis as any;

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <LenisWrapper root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      {children}
    </LenisWrapper>
  );
}
