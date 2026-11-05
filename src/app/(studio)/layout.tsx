import { AppNav } from "@/components/shell/app-nav";
import { HeaderTools } from "@/components/shell/header-tools";

// The shell. From 64rem the rail and the page each scroll on their own; below
// it the whole page scrolls under a top bar.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        <div className="flex shrink-0 justify-end px-3 pt-3 sm:px-5">
          <HeaderTools />
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
