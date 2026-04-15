import { CapsuleRevealClient } from "./CapsuleRevealClient";

export const metadata = {
  title: "Your Memory Capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CapsuleOpenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; preview?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <CapsuleRevealClient
      capsuleId={id}
      token={typeof sp.t === "string" ? sp.t : ""}
      preview={sp.preview === "1"}
    />
  );
}
