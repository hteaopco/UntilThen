import { AdminHeader } from "@/app/admin/AdminHeader";
import { STOCK_VOICE_SPECS, r2KeyForStockVoice } from "@/lib/elevenlabs";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import { RevealSongsManager } from "./RevealSongsManager";
import { StockVoiceUpload } from "./StockVoiceUpload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type StockVoicePreview = {
  key: string;
  label: string;
  context: string;
  /** Signed GET URL to listen to the currently-uploaded clip, or null. */
  url: string | null;
};

async function loadStockVoicePreviews(): Promise<StockVoicePreview[]> {
  const r2Ready = r2IsConfigured();
  return Promise.all(
    STOCK_VOICE_SPECS.map(async (spec) => {
      let url: string | null = null;
      if (r2Ready) {
        try {
          url = await signGetUrl(r2KeyForStockVoice(spec.key));
        } catch (err) {
          console.warn(
            `[admin/audio] couldn't sign ${spec.key}:`,
            (err as Error).message,
          );
        }
      }
      return {
        key: spec.key,
        label: spec.label,
        context: spec.context,
        url,
      };
    }),
  );
}

export default async function AdminAudioPage() {
  const previews = await loadStockVoicePreviews();

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <AdminHeader />

        <section>
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-3">
            Reveal background music
          </p>
          <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
            Songs uploaded here appear as picker options on every
            capsule&rsquo;s reveal curator. Keep them short ambient loops
            (2&ndash;4 minutes) and royalty-free &mdash; capsule owners
            can&rsquo;t upload their own to keep us out of licensing
            trouble.
          </p>
          <RevealSongsManager />
        </section>

        <section className="mt-12 pt-10 border-t border-navy/[0.06]">
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-3">
            Stock voice samples
          </p>
          <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
            Voice notes used by the mock recipient reveals at{" "}
            <code className="text-xs">/admin/previews</code>. Upload the
            MP3 you want to use for each slot.
          </p>

          <div className="space-y-5">
            {previews.map((p) => (
              <div
                key={p.key}
                className="rounded-lg border border-navy/[0.08] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <p className="text-[14px] font-bold text-navy">
                      {p.label}
                    </p>
                    <p className="text-[11px] text-ink-light mt-0.5">
                      {p.context}
                    </p>
                  </div>
                  {p.url ? (
                    <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-sage bg-sage-tint/60 px-2 py-0.5 rounded">
                      Uploaded
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-ink-light bg-warm-surface/50 px-2 py-0.5 rounded">
                      No clip yet
                    </span>
                  )}
                </div>

                {p.url ? (
                  <audio
                    controls
                    preload="none"
                    src={p.url}
                    className="mt-3 w-full h-10"
                  />
                ) : null}

                <StockVoiceUpload voiceKey={p.key} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
