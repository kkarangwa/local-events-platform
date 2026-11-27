// Adds demo accounts and events so a reviewer can try every feature straight away.
// Run from the server folder:  npm run seed
// Safe to run more than once: existing demo accounts and events are left as they are.

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
)

const PASSWORD = 'GadaDemo2026!'

// Dates are counted in Kigali time so "today" matches what the app uses.
function kigaliDate(offsetDays) {
  const now = new Date(Date.now() + 2 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000)
  return now.toISOString().slice(0, 10)
}

const EVENTS = [
  {
    title: 'CV and LinkedIn Clinic',
    category: 'Education',
    venue: 'Kigali Public Library, KG 18 Ave',
    offset: 0,
    time: '09:00',
    capacity: 40,
    description: 'Bring your CV. Recruiters review it with you and show how to present your experience on LinkedIn.',
    audience: ['Students', 'Youth (18-25)'],
    ages: ['18-25'],
    level: 'Beginner',
  },
  {
    title: 'Pitch Practice for Early Founders',
    category: 'Business',
    venue: 'Norrsken House, Kigali',
    offset: 4,
    time: '14:00',
    capacity: 30,
    description: 'Five-minute pitches with feedback from investors and other founders.',
    audience: ['Entrepreneurs', 'Business Leaders'],
    ages: ['26-35'],
    level: 'Intermediate',
  },
  {
    title: 'Intro to Data Analysis with Python',
    category: 'Technology',
    venue: 'kLab, Telecom House, Kigali',
    offset: 9,
    time: '10:00',
    capacity: 25,
    description: 'A hands-on workshop: load a dataset, clean it and draw your first charts.',
    audience: ['Students', 'Tech Professionals'],
    ages: ['18-25', '26-35'],
    level: 'Beginner',
  },
  {
    title: 'Women in Tech Networking Evening',
    category: 'Networking',
    venue: 'Kigali Convention Centre',
    offset: 15,
    time: '17:30',
    capacity: 80,
    description: 'Meet women working in technology across Kigali and hear three short career stories.',
    audience: ['Women', 'Tech Professionals'],
    ages: [],
    level: 'All levels',
  },
]

async function upsertUser(client, { name, email, role, extra = {} }) {
  const found = await client.query('SELECT id FROM users WHERE email = $1', [email])
  if (found.rows[0]) return found.rows[0].id
  const hash = await bcrypt.hash(PASSWORD, 12)
  const result = await client.query(
    `INSERT INTO users (name, email, password_hash, role, privacy_consent_at,
                        company_name, company_website, company_email, company_description,
                        interests, age_range, experience_level)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [name, email, hash, role, extra.company_name || null, extra.company_website || null,
      extra.company_email || null, extra.company_description || null, extra.interests || [],
      extra.age_range || null, extra.experience_level || null],
  )
  return result.rows[0].id
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'))
    await client.query('BEGIN')

    const organizerId = await upsertUser(client, {
      name: 'Demo Organizer',
      email: 'organizer@gada.demo',
      role: 'organizer',
      extra: {
        company_name: 'Kigali Career Hub',
        company_website: 'https://example.org',
        company_email: 'hello@example.org',
        company_description: 'We run free career and skills events for young people in Kigali.',
      },
    })
    const participantId = await upsertUser(client, {
      name: 'Demo Participant',
      email: 'participant@gada.demo',
      role: 'participant',
      extra: { interests: ['Students', 'Youth (18-25)', 'Tech Professionals'], age_range: '18-25', experience_level: 'Beginner' },
    })

    const existing = await client.query('SELECT COUNT(*)::int AS n FROM events WHERE organizer_id = $1', [organizerId])
    if (existing.rows[0].n === 0) {
      for (const e of EVENTS) {
        const inserted = await client.query(
          `INSERT INTO events (organizer_id, title, description, category, venue, event_date, start_time,
                               capacity, status, target_audience, target_age_ranges, target_experience)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published', $9, $10, $11)
           RETURNING id`,
          [organizerId, e.title, e.description, e.category, e.venue, kigaliDate(e.offset), e.time,
            e.capacity, e.audience, e.ages, e.level],
        )
        // The participant is registered for today's event, so they can rate it straight away.
        if (e.offset === 0) {
          await client.query(
            `INSERT INTO registrations (event_id, participant_id, status, full_name, email, phone, payment_status)
             VALUES ($1, $2, 'registered', 'Demo Participant', 'participant@gada.demo', '+250780000000', 'not_required')
             ON CONFLICT DO NOTHING`,
            [inserted.rows[0].id, participantId],
          )
        }
      }
    }

    await client.query('COMMIT')
    console.log('Demo data ready.')
    console.log(`  Organizer:   organizer@gada.demo   / ${PASSWORD}`)
    console.log(`  Participant: participant@gada.demo / ${PASSWORD}`)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Seeding failed:', error.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
