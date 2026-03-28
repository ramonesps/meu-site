import type { Metadata } from 'next'
import { projects } from '@/lib/projects'
import ProjectCard from '@/components/project-card'

export const metadata: Metadata = {
  title: 'Projetos — Ramon Sarchi',
  description: 'Projetos e iniciativas de Ramon Sarchi.',
}

export default function ProjectsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 flex-1">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Projetos</h1>
      <p className="text-gray-600 mb-10">Iniciativas e projetos em que estou envolvido.</p>
      <div className="grid gap-6 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </main>
  )
}
