import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";

// MDX posts live at the repo root under /content/posts so they can be
// authored outside src/ and still be read at build/server time via fs.
const postsDirectory = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
  readingTime: string;
  tags: string[];
  coverImage: string | null;
};

export type Post = PostMeta & {
  content: string;
};

function readPostFile(fileName: string): Post {
  const slug = fileName.replace(/\.mdx$/, "");
  const fullPath = path.join(postsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  // Prefer an explicit frontmatter readingTime, otherwise estimate it.
  const estimated = readingTime(content).text;

  return {
    slug: (data.slug as string) ?? slug,
    title: data.title as string,
    date: data.date as string,
    excerpt: data.excerpt as string,
    author: (data.author as string) ?? "The untilThen Team",
    readingTime: (data.readingTime as string) ?? estimated,
    tags: (data.tags as string[]) ?? [],
    coverImage: (data.coverImage as string) ?? null,
    content,
  };
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) return [];

  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((f) => f.endsWith(".mdx"));

  return fileNames
    .map((fileName) => {
      const { content: _content, ...meta } = readPostFile(fileName);
      return meta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): Post | null {
  const candidate = path.join(postsDirectory, `${slug}.mdx`);
  if (!fs.existsSync(candidate)) return null;
  return readPostFile(`${slug}.mdx`);
}

export function getRelatedPosts(slug: string, limit = 2): PostMeta[] {
  return getAllPosts()
    .filter((p) => p.slug !== slug)
    .slice(0, limit);
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
