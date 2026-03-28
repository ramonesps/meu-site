import Link from 'next/link'
import Image from 'next/image'

const skills = [
  'Electronic Engineering',
  'Product Management',
  'Project Management',
  'Bitcoin',
  'Agricultural Technology',
  'Agile / Scrum',
  'Business Strategy',
  'FGV · UTFPR',
]

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

      {/* About */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Sobre mim</h2>
        <div className="space-y-4 mb-10">
          <p className="text-gray-600 leading-relaxed">
            Natural de Blumenau, sou Engenheiro Eletrônico formado pela UTFPR e possuo
            especialização em Gerenciamento de Projetos pela FGV. Atuo como gerente de
            produtos de máquinas agrícolas e sou co-fundador da{' '}
            <a
              href="https://conciergebitcoin.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 underline"
            >
              Concierge Bitcoin
            </a>
            , onde ajudo pessoas a entenderem e utilizarem o Bitcoin de forma segura e consciente.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Acredito na missão de aumentar a riqueza e a liberdade individual através do Bitcoin.
            Nossos valores fundamentais são Vida, Liberdade e Propriedade.
          </p>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Áreas de atuação</h3>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}
