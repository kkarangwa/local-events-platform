const { test } = require('node:test')
const assert = require('node:assert/strict')
const { basicInsights, buildPrompt, stats, generateInsights } = require('../insights')

const feedback = [
  { rating: 5, liked: 'Practising my pitch with mentors', improve: 'More time for questions', want_next: 'A session on raising funding' },
  { rating: 4, liked: 'Meeting other founders', improve: 'Room was too small', want_next: 'Financial planning workshop' },
  { rating: 3, liked: 'The pitch template', improve: 'Started late', want_next: 'Smaller groups so everyone can pitch' },
]

test('average rating is rounded to one decimal', () => {
  assert.deepEqual(stats(feedback), { count: 3, average: 4 })
  assert.deepEqual(stats([{ rating: 5 }, { rating: 4 }, { rating: 4 }]), { count: 3, average: 4.3 })
})

test('no feedback gives a count and average of 0', () => {
  assert.deepEqual(stats([]), { count: 0, average: 0 })
})

test('basic summary returns the four expected parts', () => {
  const result = basicInsights(feedback)
  assert.match(result.summary, /3 attendees/)
  for (const key of ['liked', 'improve', 'next_ideas']) assert.ok(Array.isArray(result[key]))
})

test('prompt sent to the AI contains comments but no names, emails or phones', () => {
  const withContact = feedback.map((f) => ({ ...f, full_name: 'Jean Claude', email: 'jc@demo.test', phone: '0788000000' }))
  const prompt = buildPrompt('Startup Pitch Workshop', withContact)
  assert.match(prompt, /Practising my pitch/)
  assert.doesNotMatch(prompt, /Jean Claude|jc@demo\.test|0788000000/)
})

test('without an API key, the basic summary is used', async () => {
  const saved = process.env.GEMINI_API_KEY
  delete process.env.GEMINI_API_KEY
  const { source } = await generateInsights('Event', feedback)
  assert.equal(source, 'basic')
  if (saved) process.env.GEMINI_API_KEY = saved
})

test('if the AI call fails, it falls back to the basic summary', async () => {
  const savedKey = process.env.GEMINI_API_KEY
  const savedFetch = global.fetch
  process.env.GEMINI_API_KEY = 'test-key'
  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) })
  const { source } = await generateInsights('Event', feedback)
  assert.equal(source, 'basic')
  global.fetch = savedFetch
  if (savedKey) process.env.GEMINI_API_KEY = savedKey
  else delete process.env.GEMINI_API_KEY
})

test('a valid AI reply is turned into the four insight parts', async () => {
  const savedKey = process.env.GEMINI_API_KEY
  const savedFetch = global.fetch
  process.env.GEMINI_API_KEY = 'test-key'
  const reply = { summary: 'Attendees enjoyed the pitch practice.', liked: ['Pitch practice'], improve: ['Start on time'], next_ideas: ['Fundraising session'] }
  global.fetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }) })
  const { source, insights } = await generateInsights('Event', feedback)
  assert.equal(source, 'ai')
  assert.deepEqual(insights, reply)
  global.fetch = savedFetch
  if (savedKey) process.env.GEMINI_API_KEY = savedKey
  else delete process.env.GEMINI_API_KEY
})
