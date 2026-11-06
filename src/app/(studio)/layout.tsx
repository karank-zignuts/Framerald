import { Suspense } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { PageTransition } from "@/components/shell/page-transition";
import { FilingsBackground } from "@/components/shell/filings-background";
import { AppNav } from "@/components/shell/app-nav";

// The shell. From 64rem the sidebar and the page each scroll on their own; below it the whole page scrolls under a top bar.
// The sidebar and header read the address, which can change per request, so each sits in Suspense with a same-size placeholder.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background lg:h-dvh lg:flex-row lg:overflow-hidden">
      <div aria-hidden className="ambient pointer-events-none absolute inset-0 -z-20" />
      <FilingsBackground />
      <Suspense fallback={<div aria-hidden className="m-2 mr-0 hidden w-60 shrink-0 rounded-2xl border border-border bg-card lg:block" />}>
        <AppNav />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        <Suspense fallback={<div aria-hidden className="h-12 shrink-0" />}>
          <AppHeader />
        </Suspense>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden"><Suspense fallback={null}>
          <PageTransition>{children}</PageTransition>
        </Suspense></main>
      </div>
    </div>
  );
}
