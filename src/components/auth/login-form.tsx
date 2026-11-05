"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, next }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; next?: string };
      if (!res.ok) {
        setError(body.error ?? "Couldn't sign in. Try again.");
        return;
      }
      router.replace(body.next ?? "/image");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (password && !busy) void submit();
      }}
      className="flex flex-col gap-4"
    >
      <h1 className="text-lg font-medium text-foreground">Sign in</h1>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-sm text-muted-foreground">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={200}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/50 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={!password || busy} aria-busy={busy} className="bg-brand text-brand-foreground hover:bg-brand-strong">
        {busy ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
