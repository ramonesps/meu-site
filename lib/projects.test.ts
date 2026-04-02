import { describe, it, expect } from 'vitest'
import { projects } from './projects'

// Testes de contrato: garantem que os dados do portfólio estejam corretos
// e que a interface com projetos externos (como o monitor-imobiliario) seja preservada.

describe('projects data', () => {
  it('Monitor Imobiliário usa HTTPS no subdomínio correto', () => {
    const monitor = projects.find((p) => p.title === 'Monitor Imobiliário')
    expect(monitor).toBeDefined()
    expect(monitor!.liveUrl).toBe('https://monitor.ramonps.com')
  })

  it('Monitor Imobiliário não expõe IP bruto ou porta', () => {
    const monitor = projects.find((p) => p.title === 'Monitor Imobiliário')
    expect(monitor!.liveUrl).not.toMatch(/\d+\.\d+\.\d+\.\d+/)
    expect(monitor!.liveUrl).not.toMatch(/:\d+/)
  })

  it('todos os liveUrls são HTTPS ou caminhos relativos', () => {
    for (const project of projects) {
      if (project.liveUrl && project.liveUrl.startsWith('http')) {
        expect(project.liveUrl).toMatch(/^https:\/\//)
      }
    }
  })

  it('todos os githubUrls são HTTPS', () => {
    for (const project of projects) {
      if (project.githubUrl) {
        expect(project.githubUrl).toMatch(/^https:\/\//)
      }
    }
  })
})
