import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-20 flex-1">
      {/* Hero */}
      <section className="mb-24">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
          <Image
            src="/profile.jpg"
            alt="Ramon Sarchi"
            width={120}
            height={120}
            className="rounded-full object-cover border-4 border-white shadow-md shrink-0"
            priority
          />
          <div>
            <p className="text-indigo-600 font-medium mb-2 text-sm tracking-wide uppercase">
              Olá, sou
            </p>
            <h1 className="text-5xl font-bold text-gray-900 mb-3 leading-tight">
              Ramon Sarchi
            </h1>
            <p className="text-xl text-gray-600 max-w-xl leading-relaxed">
              Product Manager · Engenheiro Eletrônico · Co-fundador da Concierge Bitcoin
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-8">
          <Link
            href="/projects"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Ver Projetos
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Entrar em Contato
          </Link>
        </div>
      </section>
    </main>
  )
}
