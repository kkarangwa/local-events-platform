// Turns attendee feedback for one event into a short summary for the organizer.
//
// With GEMINI_API_KEY set, the comments are summarised by Google's Gemini model.
// Without a key, or if the AI call fails, a simple keyword analysis runs instead,
// so organizers always get a result.
//
// Privacy: only ratings and comment text are sent to the AI. No names, emails or
// phone numbers ever leave the server.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'
const GEMINI_TIMEOUT_MS = 20000

const STOP_WORDS = new Set(`a an and are as at be but by for from had has have i if in into is it its
it's me more my no not of on or our so than that the their them there they this to too was we were
what when which who will with would you your very really just also event events session sessions
like liked good great nice next time more less some all one can could get got lot lots much many
make made did do does about been being should want wanted would'd am was it'd i'm im`.split(/\s+/))

function cleanList(value, max = 4) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max)
}

function topPhrases(texts, max = 4) {
  const counts = new Map()

  for (const text of texts) {
    const words = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))

    const seen = new Set()
    for (let i = 0; i < words.length; i += 1) {
      seen.add(words[i])
      if (i + 1 < words.length) seen.add(`${words[i]} ${words[i + 1]}`)
    }
    for (const key of seen) counts.set(key, (counts.get(key) || 0) + 1)
  }

  const ranked = [...counts.entries()]
    .filter(([, count]) => count >= 2 || texts.length <= 2)
    .sort((a, b) => b[1] - a[1] || b[0].split(' ').length - a[0].split(' ').length)

  const picked = []
  for (const [phrase, count] of ranked) {
    // Skip a single word already covered by a chosen two-word phrase.
    if (picked.some((p) => p.phrase.includes(phrase) || phrase.includes(p.phrase))) continue
    picked.push({ phrase, count })
    if (picked.length === max) break
  }

  return picked.map(({ phrase, count }) =>
    count > 1 ? `"${phrase}" (mentioned by ${count} attendees)` : `"${phrase}"`
  )
}

function stats(feedback) {
  const count = feedback.length
  const average = count
    ? Math.round((feedback.reduce((sum, row) => sum + Number(row.rating), 0) / count) * 10) / 10
    : 0
  return { count, average }
}

function basicInsights(feedback) {
  const { count, average } = stats(feedback)
  const liked = topPhrases(feedback.map((row) => row.liked))
  const improve = topPhrases(feedback.map((row) => row.improve))
  const next = topPhrases(feedback.map((row) => row.want_next))

  return {
    summary: `${count} attendee${count === 1 ? '' : 's'} gave this event an average rating of ${average} out of 5.`,
    liked,
    improve,
    next_ideas: next,
  }
}

function buildPrompt(eventTitle, feedback) {
  const lines = feedback.map((row, index) => {
    const parts = [`#${index + 1} rating ${row.rating}/5`]
    if (row.liked) parts.push(`liked: ${row.liked}`)
    if (row.improve) parts.push(`could improve: ${row.improve}`)
    if (row.want_next) parts.push(`wants next: ${row.want_next}`)
    return parts.join(' | ')
  })

  return `You help event organizers in Kigali, Rwanda understand attendee feedback.
Event: "${eventTitle}"
Anonymous feedback from ${feedback.length} attendees:
${lines.join('\n')}

Write in plain, friendly English for a busy organizer. Only use what the feedback says; do not invent details.
Return JSON only, in this shape:
{"summary": "2 sentences on how the event went overall",
 "liked": ["up to 4 short points attendees liked most"],
 "improve": ["up to 4 short, practical things to improve"],
 "next_ideas": ["up to 4 ideas for the organizer's next event, based on what attendees asked for"]}`
}

async function geminiInsights(eventTitle, feedback, apiKey) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(eventTitle, feedback) }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      const error = new Error(`Gemini responded ${response.status}`)
      error.status = response.status
      throw error
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''))

    const result = {
      summary: String(parsed.summary || '').trim(),
      liked: cleanList(parsed.liked),
      improve: cleanList(parsed.improve),
      next_ideas: cleanList(parsed.next_ideas),
    }

    if (!result.summary) throw new Error('Gemini returned an empty summary')
    return result
  } finally {
    clearTimeout(timer)
  }
}

// Google answers 429 (busy, rate limited) or 5xx (e.g. 503 overloaded) for short
// periods. Those are worth one more try; a wrong key (400/403) is not.
const RETRYABLE = new Set([429, 500, 502, 503, 504])
const RETRY_DELAY_MS = Number(process.env.GEMINI_RETRY_DELAY_MS || 2000)

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function generateInsights(eventTitle, feedback) {
  const apiKey = process.env.GEMINI_API_KEY

  if (apiKey) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return { source: 'ai', insights: await geminiInsights(eventTitle, feedback, apiKey) }
      } catch (error) {
        const retry = attempt === 1 && RETRYABLE.has(error.status)
        console.error(
          `AI insights failed (attempt ${attempt})${retry ? ', retrying' : ', using basic analysis'}:`,
          error.message
        )
        if (!retry) break
        await wait(RETRY_DELAY_MS)
      }
    }
  }

  return { source: 'basic', insights: basicInsights(feedback) }
}

module.exports = { generateInsights, basicInsights, buildPrompt, stats }
