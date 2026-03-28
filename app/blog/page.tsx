import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog'
import BlogCard from '@/components/blog-card'

export const metadata: Metadata = {
  title: 'Blog — Ramon Sarchi',
  description: 'Artigos e reflexões sobre Bitcoin, tecnologia e gestão.',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 flex-1">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog</h1>
      <p className="text-gray-600 mb-2">
        Artigos e reflexões sobre Bitcoin, tecnologia e gestão.
      </p>
      {posts.length === 0 ? (
        <p className="text-gray-500 mt-10">Nenhum post ainda. Volte em breve!</p>
      ) : (
        <div className="mt-8">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </main>
  )
}
