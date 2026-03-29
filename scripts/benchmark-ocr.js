const fs = require('node:fs')
const path = require('node:path')
const { getOcrProvider, normalizeText } = require('./lib/ocr-providers')

const DEFAULT_PROVIDERS = ['ocr-space', 'tesseract-js']

function parseProviderList() {
  const raw = process.env.OCR_BENCH_PROVIDERS
  if (!raw) {
    return DEFAULT_PROVIDERS
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function loadCases() {
  const filePath = path.join(process.cwd(), 'content', 'ocr-benchmark-cases.json')
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.cases) ? parsed.cases : []
}

function computeKeywordScore(text, keywords) {
  if (!keywords.length) {
    return 0
  }

  const normalizedText = normalizeText(text).toLowerCase()
  const matched = keywords.filter((keyword) =>
    normalizedText.includes(normalizeText(keyword).toLowerCase())
  )

  return {
    matchedKeywords: matched,
    score: matched.length / keywords.length,
  }
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

async function runProviderBench(providerName, cases) {
  const startedAt = Date.now()
  const results = []
  let providerFn

  try {
    providerFn = getOcrProvider(providerName)
  } catch (error) {
    return {
      provider: providerName,
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown provider error',
      avgScore: 0,
      avgLatencyMs: 0,
      cases: [],
      totalDurationMs: Date.now() - startedAt,
    }
  }

  for (const testCase of cases) {
    const caseStart = Date.now()
    try {
      const text = await providerFn(testCase.imageUrl)
      const latencyMs = Date.now() - caseStart
      const { matchedKeywords, score } = computeKeywordScore(
        text,
        testCase.expectedKeywords || []
      )

      results.push({
        id: testCase.id,
        latencyMs,
        score: round(score),
        matchedKeywords,
        expectedKeywords: testCase.expectedKeywords || [],
        text,
        status: 'ok',
      })
    } catch (error) {
      results.push({
        id: testCase.id,
        latencyMs: Date.now() - caseStart,
        score: 0,
        matchedKeywords: [],
        expectedKeywords: testCase.expectedKeywords || [],
        text: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown OCR error',
      })
    }
  }

  const okCases = results.filter((entry) => entry.status === 'ok')
  const avgScore =
    okCases.length > 0
      ? round(okCases.reduce((sum, entry) => sum + entry.score, 0) / okCases.length)
      : 0
  const avgLatencyMs =
    okCases.length > 0
      ? Math.round(okCases.reduce((sum, entry) => sum + entry.latencyMs, 0) / okCases.length)
      : 0

  return {
    provider: providerName,
    status: okCases.length > 0 ? 'ok' : 'error',
    avgScore,
    avgLatencyMs,
    cases: results,
    totalDurationMs: Date.now() - startedAt,
  }
}

function pickRecommendation(providerResults) {
  const eligible = providerResults.filter((item) => item.status === 'ok')
  if (!eligible.length) {
    return {
      provider: null,
      reason: 'No provider completed at least one case successfully.',
    }
  }

  const sorted = [...eligible].sort((a, b) => {
    if (b.avgScore !== a.avgScore) {
      return b.avgScore - a.avgScore
    }
    return a.avgLatencyMs - b.avgLatencyMs
  })

  const winner = sorted[0]
  return {
    provider: winner.provider,
    reason: `Highest average keyword score (${winner.avgScore}) with avg latency ${winner.avgLatencyMs}ms.`,
  }
}

async function main() {
  const providers = parseProviderList()
  const cases = loadCases()

  if (!cases.length) {
    throw new Error('No benchmark cases found in content/ocr-benchmark-cases.json')
  }

  const providerResults = []
  for (const provider of providers) {
    // Run sequentially to avoid noisy latency overlap.
    // This makes provider-to-provider comparison more stable.
    const result = await runProviderBench(provider, cases)
    providerResults.push(result)
  }

  const recommendation = pickRecommendation(providerResults)
  const payload = {
    generatedAt: new Date().toISOString(),
    providers,
    cases: cases.map((item) => item.id),
    results: providerResults,
    recommendation,
  }

  const outputPath = path.join(process.cwd(), 'content', 'ocr-benchmark-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2))

  console.log('OCR benchmark finished:')
  providerResults.forEach((result) => {
    console.log(
      `- ${result.provider}: status=${result.status}, avgScore=${result.avgScore}, avgLatencyMs=${result.avgLatencyMs}`
    )
  })
  console.log(
    `Recommended provider: ${recommendation.provider || 'none'} (${recommendation.reason})`
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
