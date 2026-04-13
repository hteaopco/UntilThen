export type MediaItem = {
  url: string;
  kind: "photo" | "voice" | "video";
};

export function MediaDisplay({ items }: { items: MediaItem[] }) {
  if (items.length === 0) return null;
  const photos = items.filter((i) => i.kind === "photo");
  const voices = items.filter((i) => i.kind === "voice");
  const videos = items.filter((i) => i.kind === "video");

  return (
    <div className="mt-8 space-y-5">
      {photos.length > 0 && (
        <div
          className={`grid gap-3 ${
            photos.length === 1
              ? "grid-cols-1"
              : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.url}
              src={p.url}
              alt=""
              className="w-full h-auto rounded-xl border border-navy/[0.06] shadow-sm"
            />
          ))}
        </div>
      )}
      {videos.map((v) => (
        <video
          key={v.url}
          src={v.url}
          controls
          playsInline
          className="w-full rounded-xl border border-navy/[0.06] bg-black"
        />
      ))}
      {voices.map((a) => (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio key={a.url} src={a.url} controls className="w-full" />
      ))}
    </div>
  );
}
