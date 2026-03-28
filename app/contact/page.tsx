import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contato — Ramon Sarchi',
  description: 'Entre em contato com Ramon Sarchi.',
}

const contacts = [
  {
    label: 'Email',
    value: 'ramonplatini@gmail.com',
    href: 'mailto:ramonplatini@gmail.com',
    description: 'Melhor para consultas e projetos',
  },
  {
    label: 'LinkedIn',
    value: 'ramonsarchi',
    href: 'https://www.linkedin.com/in/ramonsarchi/',
    description: 'Histórico profissional',
  },
  {
    label: 'Twitter / X',
    value: '@ramonps',
    href: 'https://x.com/ramonps',
    description: 'Pensamentos e atualizações',
  },
  {
    label: 'Facebook',
    value: 'ramonplatini',
    href: 'https://web.facebook.com/ramonplatini',
    description: 'Redes sociais',
  },
  {
    label: 'Concierge Bitcoin',
    value: 'conciergebitcoin.com.br',
    href: 'https://conciergebitcoin.com.br',
    description: 'Assessoria e educação em Bitcoin',
  },
]

export default function ContactPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 flex-1">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contato</h1>
      <p className="text-gray-600 mb-10 max-w-lg">
        Tem alguma dúvida ou quer conversar? Fique à vontade para entrar em contato
        por qualquer um dos canais abaixo.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-2xl">
        {contacts.map((contact) => (
          <a
            key={contact.label}
            href={contact.href}
            target={contact.href.startsWith('http') ? '_blank' : undefined}
            rel={contact.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="block p-5 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
          >
            <p className="font-semibold text-gray-900 group-hover:text-indigo-700 mb-0.5 transition-colors">
              {contact.label}
            </p>
            <p className="text-sm text-indigo-600 mb-1 font-medium">{contact.value}</p>
            <p className="text-xs text-gray-500">{contact.description}</p>
          </a>
        ))}
      </div>
    </main>
  )
}
