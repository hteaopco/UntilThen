import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { Footer } from "@/components/landing/Footer";
import { Nav } from "@/components/landing/Nav";
import {
  formatPostDate,
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  type PostMeta,
} from "@/lib/posts";

const SITE_URL = "https://untilthenapp.io";

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const url = `${SITE_URL}/blog/${post.slug}`;
  // Posts without a cover image still get a sharable preview card
  // via the default /api/og route.
  const images = post.coverImage
    ? [
        {
          url: post.coverImage.startsWith("http")
            ? post.coverImage
            : `${SITE_URL}${post.coverImage}`,
        },
      ]
    : [{ url: `${SITE_URL}/api/og`, width: 1200, height: 630 }];

  return {
    title: `${post.title} — untilThen`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: images?.map((i) => i.url),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post.slug, 2);

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-[120px] pb-20 px-6 lg:px-14">
        <div className="mx-auto max-w-[720px]">
          <Link
            href="/blog"
            prefetch={false}
            className="inline-flex items-center gap-2 text-sm text-ink-mid hover:text-amber transition-colors mb-8"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Back to blog</span>
          </Link>

          {post.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt=""
              className="w-full max-h-[380px] object-cover rounded-2xl mb-10"
            />
          )}

          <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-amber mb-3">
            {formatPostDate(post.date)} · {post.readingTime}
          </div>
          <p className="text-sm text-ink-mid mb-5">By {post.author}</p>

          <h1 className="text-[clamp(32px,4.2vw,46px)] font-extrabold text-navy tracking-[-1.2px] leading-[1.1] mb-6">
            {post.title}
          </h1>

          <hr className="border-t border-navy/[0.08] my-10" />

          <article className="blog-prose">
            <MDXRemote source={post.content} />
          </article>

          <hr className="border-t border-navy/[0.08] my-12" />

          <CtaCard />

          {related.length > 0 && (
            <div className="mt-16">
              <div className="mb-5 text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid">
                More posts
              </div>
              <ul className="grid gap-5 sm:grid-cols-2">
                {related.map((p) => (
                  <li key={p.slug}>
                    <RelatedCard post={p} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function CtaCard() {
  return (
    <div className="rounded-2xl bg-amber-tint border border-amber/20 px-8 py-10 text-center">
      <div aria-hidden="true" className="text-4xl mb-4">
        💌
      </div>
      <h2 className="text-[22px] font-extrabold text-navy tracking-[-0.3px] mb-2">
        Ready to start writing?
      </h2>
      <p className="text-[15px] text-ink-mid mb-6">
        Your child&rsquo;s vault is waiting.
      </p>
      <Link
        href="/#cta"
        className="inline-block bg-amber text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
      >
        Join the waitlist →
      </Link>
    </div>
  );
}

function RelatedCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      prefetch={false}
      className="group block h-full rounded-xl bg-white border border-navy/[0.07] px-5 py-5 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,31,61,0.06)] hover:border-amber/30 transition-all"
    >
      <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-amber mb-2">
        {formatPostDate(post.date)} · {post.readingTime}
      </div>
      <h3 className="text-[16px] font-bold text-navy leading-[1.3] mb-1">
        {post.title}
      </h3>
      <p className="text-sm text-ink-mid leading-[1.5] line-clamp-2">
        {post.excerpt}
      </p>
    </Link>
  );
}
