import { AppNav } from "@/components/shell/app-nav";

// The shell. From 64rem the rail and the page each scroll on their own; below
// it the whole page scrolls under a top bar.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <AppNav />
      <main className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">{children}</main>
    </div>
  );
}
