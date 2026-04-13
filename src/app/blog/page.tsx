import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { Nav } from "@/components/landing/Nav";
import { formatPostDate, getAllPosts, type PostMeta } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog — untilThen",
  description:
    "Stories, prompts and ideas for parents who want to leave something behind for their children.",
  openGraph: {
    title: "The untilThen Blog",
    description:
      "Stories, prompts and ideas for parents who want to leave something behind.",
    url: "https://untilthenapp.io/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The untilThen Blog",
    description:
      "Stories, prompts and ideas for parents who want to leave something behind.",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-[120px] pb-20 px-6 lg:px-14">
        <div className="mx-auto max-w-[1100px]">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber mb-3.5">
            Blog
          </p>
          <h1 className="text-[clamp(32px,4.5vw,48px)] font-extrabold tracking-[-1.5px] text-navy leading-[1.08] mb-5">
            The untilThen Blog
          </h1>
          <p className="text-base text-ink-mid leading-[1.7] max-w-[560px]">
            Stories, prompts and ideas for parents who want to leave
            something behind.
          </p>

          <div className="mt-12 mb-6 text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid">
            Latest posts
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-navy/15 bg-warm-surface px-6 py-16 text-center">
              <p className="text-sm text-ink-mid">
                No posts yet. Check back soon.
              </p>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.slug}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      prefetch={false}
      className="group block h-full rounded-2xl bg-white border border-navy/[0.07] shadow-[0_2px_8px_rgba(15,31,61,0.04)] overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,31,61,0.08)] hover:border-amber/30 transition-all"
    >
      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt=""
          className="w-full h-44 object-cover"
        />
      )}
      <div className="px-6 py-6 flex flex-col h-full">
        <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-amber mb-3">
          {formatPostDate(post.date)} · {post.readingTime}
        </div>
        <h2 className="text-[20px] font-extrabold text-navy tracking-[-0.3px] leading-[1.25] mb-3">
          {post.title}
        </h2>
        <p className="text-sm leading-[1.6] text-ink-mid line-clamp-3">
          {post.excerpt}
        </p>
        <div className="mt-5 text-[13px] font-bold text-amber group-hover:text-amber-dark transition-colors">
          Read more →
        </div>
      </div>
    </Link>
  );
}
