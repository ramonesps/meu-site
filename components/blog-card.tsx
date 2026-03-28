import type { PostMeta } from '@/lib/blog'
import Link from 'next/link'

export default function BlogCard({ post }: { post: PostMeta }) {
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <article className="border-b border-gray-200 py-8 last:border-0">
      <time className="text-sm text-gray-500" dateTime={post.date}>
        {formattedDate}
      </time>
      <h2 className="text-xl font-semibold text-gray-900 mt-1 mb-2">
        <Link
          href={`/blog/${post.slug}`}
          className="hover:text-indigo-600 transition-colors"
        >
          {post.title}
        </Link>
      </h2>
      <p className="text-gray-600 text-sm leading-relaxed mb-3">{post.excerpt}</p>
      <Link
        href={`/blog/${post.slug}`}
        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        Read more &rarr;
      </Link>
    </article>
  )
}
