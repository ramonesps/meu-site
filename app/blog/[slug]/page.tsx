import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPost } from '@/lib/blog'

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const post = getPost(slug)
    return {
      title: `${post.title} — Ramon Sarchi`,
      description: post.excerpt,
    }
  } catch {
    return {}
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let post
  try {
    post = getPost(slug)
  } catch {
    notFound()
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <main className="max-w-2xl mx-auto px-6 py-16 flex-1">
      <Link
        href="/blog"
        className="text-sm text-indigo-600 hover:text-indigo-700 mb-8 inline-block transition-colors"
      >
        &larr; Back to Blog
      </Link>
      <article>
        <header className="mb-10">
          <time className="text-sm text-gray-500" dateTime={post.date}>
            {formattedDate}
          </time>
          <h1 className="text-3xl font-bold text-gray-900 mt-2 leading-tight">
            {post.title}
          </h1>
        </header>
        <div className="blog-content">
          <MDXRemote source={post.content} />
        </div>
      </article>
    </main>
  )
}
