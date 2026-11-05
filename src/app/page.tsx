import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Phase 0 placeholder. It proves the tokens, the beam and the brand accent
// render together. The real studio screens arrive in Phase 1.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-brand">Framerald</p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground">
          What do you want to make?
        </h1>
        <p className="text-muted-foreground">
          Image and video studio. Generation is wired up in Phase 1.
        </p>
      </header>

      <BorderBeam size="md" colorVariant="colorful" theme="dark" className="block w-full">
        <Textarea
          aria-label="Prompt"
          placeholder="A slow dolly shot through a rain-soaked neon street at night"
          rows={4}
        />
      </BorderBeam>

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" disabled>
          Refine with agent
        </Button>
        <Button
          disabled
          className="bg-brand text-brand-foreground hover:bg-brand-strong"
        >
          Generate
        </Button>
      </div>
    </main>
  );
}
