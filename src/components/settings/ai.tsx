"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sparkles, ExternalLink, KeyRound, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { ConfirmButton } from "@/components/ui/confirm";
import { PROVIDERS, providerMeta } from "@/lib/ai/providers";
import { saveAiSettingsAction, testAiAction, deleteAiSettingsAction, setAiEnabledAction } from "@/app/actions/settings";
import type { PublicAiSettings } from "@/lib/services/ai-settings";
import type { AiProvider } from "@/db/schema";
import { cn } from "@/lib/utils";

export function AiCard({ current }: { current: PublicAiSettings | null }) {
  const t = useTranslations("ai");
  const router = useRouter();
  const [provider, setProvider] = useState<AiProvider>(current?.provider ?? "google");
  const meta = providerMeta(provider);
  const [model, setModel] = useState(current?.model ?? meta.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(current?.baseUrl ?? meta.defaultBaseUrl ?? "");
  const [temperature, setTemperature] = useState(current?.temperature ?? 0.4);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const sameProvider = current?.provider === provider;

  const pick = (p: AiProvider) => {
    setProvider(p);
    const m = providerMeta(p);
    setModel(current?.provider === p ? current.model : m.defaultModel);
    setBaseUrl(current?.provider === p ? current.baseUrl ?? "" : m.defaultBaseUrl ?? "");
  };

  const report = (r: { ok: boolean; error?: string }) =>
    r.ok ? toast.success(t("testOk")) : toast.error(t("testFail", { error: r.error ?? "unknown" }), { duration: 8000 });

  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-violet-500 text-white">
          <Sparkles className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold">{t("title")}</h2>
        {current ? (
          current.lastTestOk === false ? (
            <Badge tone="danger">
              <XCircle className="size-3" /> {providerMeta(current.provider).label}
            </Badge>
          ) : (
            <Badge tone="success">
              <CheckCircle2 className="size-3" /> {providerMeta(current.provider).label}
            </Badge>
          )
        ) : (
          <Badge>{t("notSet")}</Badge>
        )}
      </div>
      <p className="mb-5 flex items-start gap-2 text-sm text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
        {t("sub")}
      </p>

      <span className="mb-2 block text-sm font-semibold">{t("provider")}</span>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p.id)}
            className={cn(
              "flex flex-col items-start rounded-2xl border px-3 py-2.5 text-left transition",
              provider === p.id ? "border-accent bg-accent-soft" : "border-border hover:bg-soft",
            )}
          >
            <span className="text-sm font-semibold">{p.label}</span>
            {p.freeTier && <span className="text-[11px] font-semibold text-success">{t("freeTier")}</span>}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy("save");
          const r = await saveAiSettingsAction({ provider, model, apiKey: apiKey || undefined, baseUrl: baseUrl || null, temperature });
          setBusy(null);
          if (!r.ok) return toast.error(r.error);
          setApiKey("");
          report(r.data);
          router.refresh();
        }}
      >
        <Field
          label={t("apiKey")}
          hint={
            <span className="flex flex-wrap items-center gap-x-3">
              {sameProvider && current && (
                <span>
                  <KeyRound className="mr-1 inline size-3" />
                  {t("apiKeySaved", { hint: current.keyHint })} — {t("replaceKey")}
                </span>
              )}
              {meta.keyUrl && (
                <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent">
                  {t("getKey")} <ExternalLink className="size-3" />
                </a>
              )}
            </span>
          }
        >
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={sameProvider && current ? "••••••••••••" : meta.keyPlaceholder}
            required={!sameProvider || !current}
            className="font-mono"
          />
        </Field>
        <Field label={t("model")}>
          <Input value={model} onChange={(e) => setModel(e.target.value)} list={`models-${provider}`} required className="font-mono text-sm" />
          <datalist id={`models-${provider}`}>
            {meta.models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        {(meta.needsBaseUrl || provider === "openrouter") && (
          <Field label={t("baseUrl")}>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" required={meta.needsBaseUrl} className="font-mono text-sm" />
          </Field>
        )}
        <Field label={`${t("temperature")}: ${temperature.toFixed(1)}`}>
          <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="accent-[var(--accent)]" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy === "save"}>
            {t("save")}
          </Button>
          {current && (
            <Button
              type="button"
              variant="outline"
              loading={busy === "test"}
              onClick={async () => {
                setBusy("test");
                const r = await testAiAction();
                setBusy(null);
                if (!r.ok) return toast.error(r.error);
                report(r.data);
                router.refresh();
              }}
            >
              {busy === "test" ? t("testing") : t("test")}
            </Button>
          )}
          {current && (
            <ConfirmButton
              confirmLabel={t("remove")}
              onConfirm={async () => {
                await deleteAiSettingsAction();
                toast.success(t("removed"));
                router.refresh();
              }}
            >
              {t("remove")}
            </ConfirmButton>
          )}
        </div>
      </form>
      {current && (
        <div className="mt-4 border-t border-border pt-3">
          <Switch
            checked={current.enabled}
            label={t("enabled")}
            onChange={async (v) => {
              await setAiEnabledAction(v);
              router.refresh();
            }}
          />
        </div>
      )}
    </Card>
  );
}
