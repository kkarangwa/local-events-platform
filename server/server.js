const express = require('express')
const cors = require('cors')
const { Pool, types } = require('pg')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { generateInsights, stats: feedbackStats } = require('./insights')

const app = express()
const PORT = Number(process.env.PORT) || 5001
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is missing from server/.env')
}

// Return DATE columns as plain 'YYYY-MM-DD' strings. Without this, pg turns them
// into JavaScript Dates at local midnight, and on Kigali time (UTC+2) the JSON
// output shows the previous day.
types.setTypeParser(1082, (value) => value)

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.DB_SSL === 'false'
            ? false
            : { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
)

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message)
})

const allowedOrigins = (
  process.env.CLIENT_ORIGIN || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '20kb' }))
app.use(express.urlencoded({ extended: true })) // Africa's Talking posts USSD data as form-encoded

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    company_name: user.company_name || '',
    company_website: user.company_website || '',
    company_email: user.company_email || '',
    company_description: user.company_description || '',
    interests: user.interests || [],
    age_range: user.age_range || '',
    experience_level: user.experience_level || '',
  }
}

function createToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  )
}


function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || ''
  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    console.warn('Auth failed: missing or invalid Authorization header')
    return res.status(401).json({
      success: false,
      message: 'Please sign in to continue.',
    })
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET)
    return next()
  } catch (error) {
    console.error('JWT verification failed:', error.name, error.message)

    return res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please sign in again.'
        : 'Your session token is invalid. Please sign in again.',
    })
  }
}


function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      })
    }

    return next()
  }
}

const {
  AUDIENCE_TAGS,
  AGE_RANGES,
  EXPERIENCE_LEVELS,
  validateAudienceTags,
  validateTargeting,
  hasTargeting,
  computeMatchScore,
} = require('./matching')

// Shared event fields and public organizer information.
const eventSelect = `
  e.id,
  e.organizer_id,
  e.title,
  e.description,
  e.category,
  e.venue,
  e.event_date,
  e.start_time,
  e.capacity,
  e.status,
  e.price_type,
  e.price,
  e.currency,
  e.payment_instructions,
  e.target_audience,
  e.target_age_ranges,
  e.target_experience,
  e.created_at,
  u.name AS organizer_name,
  u.company_name AS organizer_company,
  u.company_website AS organizer_website,
  u.company_email AS organizer_company_email,
  u.company_description AS organizer_company_description
`

function validatePricing({ price_type, price, payment_instructions }) {
  if (!['free', 'paid'].includes(price_type)) {
    return 'Choose whether the event is free or paid.'
  }

  if (price_type === 'paid') {
    const numericPrice = Number(price)

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return 'Enter a price greater than zero for a paid event.'
    }

    if (
      typeof payment_instructions !== 'string' ||
      !payment_instructions.trim()
    ) {
      return 'Add payment instructions so participants know how to pay (e.g. Mobile Money number).'
    }
  }

  return null
}

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Gada Events API is running!',
  })
})

app.get('/api/db-health', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database'
    )

    res.json({
      success: true,
      message: 'Database connection successful!',
      database: result.rows[0].database,
    })
  } catch (error) {
    console.error('Database health check failed:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not connect to the database.',
    })
  }
})

// REGISTER (CREATE ACCOUNT)
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'participant',
      acceptPrivacy,
    } = req.body || {}

    // Consent first: no account is created unless the person has agreed
    // to the Privacy Policy. The time of consent is stored with the user.
    if (acceptPrivacy !== true) {
      return res.status(400).json({
        success: false,
        message: 'Please read and accept the Privacy Policy to create an account.',
      })
    }

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a name of 1–100 characters.',
      })
    }

    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      })
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.',
      })
    }

    if (!['participant', 'organizer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Choose participant or organizer.',
      })
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, privacy_consent_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, email, role, created_at,
                 company_name, company_website, company_email,
                 company_description`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        await bcrypt.hash(password, 12),
        role,
      ]
    )

    const user = publicUser(result.rows[0])

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token: createToken(user),
      user,
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    console.error('Registration failed:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not create the account.',
    })
  }
})

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      })
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, created_at,
              company_name, company_website, company_email,
              company_description,
              interests, age_range, experience_level
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email.trim().toLowerCase()]
    )

    const record = result.rows[0]

    if (
      !record ||
      !record.password_hash ||
      !(await bcrypt.compare(password, record.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    const user = publicUser(record)

    res.json({
      success: true,
      message: 'Login successful.',
      token: createToken(user),
      user,
    })
  } catch (error) {
    console.error('Login failed:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not log in.',
    })
  }
})

// CURRENT USER
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at,
              company_name, company_website, company_email,
              company_description,
              interests, age_range, experience_level
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.auth.userId]
    )

    if (!result.rows[0]) {
      return res.status(401).json({
        success: false,
        message: 'Account no longer exists. Please sign in again.',
      })
    }

    res.json({
      success: true,
      user: publicUser(result.rows[0]),
    })
  } catch (error) {
    console.error('Could not retrieve user:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not verify your session.',
    })
  }
})

// DELETE MY ACCOUNT (right to erasure)
// The user confirms with their password. Everything tied to the account is
// removed in one transaction: their registrations, and for organizers their
// events and the registrations made for those events.
app.delete('/api/auth/me', requireAuth, async (req, res) => {
  const { password } = req.body || {}

  if (typeof password !== 'string' || !password) {
    return res.status(400).json({
      success: false,
      message: 'Enter your password to confirm.',
    })
  }

  const client = await pool.connect()

  try {
    const found = await client.query(
      'SELECT id, role, password_hash FROM users WHERE id = $1',
      [req.auth.userId]
    )
    const record = found.rows[0]

    if (!record || !(await bcrypt.compare(password, record.password_hash))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect. Your account was not deleted.',
      })
    }

    await client.query('BEGIN')

    if (record.role === 'organizer') {
      await client.query(
        `DELETE FROM registrations
         WHERE event_id IN (SELECT id FROM events WHERE organizer_id = $1)`,
        [record.id]
      )
      await client.query('DELETE FROM events WHERE organizer_id = $1', [record.id])
    }

    await client.query('DELETE FROM registrations WHERE participant_id = $1', [record.id])
    await client.query('DELETE FROM users WHERE id = $1', [record.id])
    await client.query('COMMIT')

    res.json({
      success: true,
      message: 'Your account and personal data have been deleted.',
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Account deletion failed:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not delete the account. Nothing was removed.',
    })
  } finally {
    client.release()
  }
})

// UPDATE ORGANIZER COMPANY PROFILE
app.patch(
  '/api/organizer/profile',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const {
        company_name = '',
        company_website = '',
        company_email = '',
        company_description = '',
      } = req.body || {}

      const fields = [
        ['Company name', company_name, 200],
        ['Company website', company_website, 500],
        ['Company email', company_email, 255],
        ['Company description', company_description, 5000],
      ]

      for (const [label, value, max] of fields) {
        if (typeof value !== 'string' || value.length > max) {
          return res.status(400).json({
            success: false,
            message: `${label} must be text with at most ${max} characters.`,
          })
        }
      }

      if (
        company_website.trim() &&
        !/^https?:\/\/\S+$/i.test(company_website.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Website must start with http:// or https://.',
        })
      }

      if (
        company_email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company_email.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid public company email.',
        })
      }

      const result = await pool.query(
        `UPDATE users
         SET company_name = $1,
             company_website = $2,
             company_email = $3,
             company_description = $4
         WHERE id = $5 AND role = 'organizer'
         RETURNING id, name, email, role, created_at,
                   company_name, company_website, company_email,
                   company_description`,
        [
          company_name.trim(),
          company_website.trim(),
          company_email.trim(),
          company_description.trim(),
          req.auth.userId,
        ]
      )

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Organizer account not found.',
        })
      }

      res.json({
        success: true,
        message: 'Organizer profile updated.',
        user: publicUser(result.rows[0]),
      })
    } catch (error) {
      console.error('Profile update failed:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not update organizer profile.',
      })
    }
  }
)

// PUBLIC: PUBLISHED EVENTS
app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${eventSelect}
       FROM events e
       JOIN users u ON u.id = e.organizer_id
       WHERE e.status = 'published'
       ORDER BY e.event_date ASC, e.start_time ASC`
    )

    res.json({
      success: true,
      count: result.rows.length,
      events: result.rows,
    })
  } catch (error) {
    console.error('Failed to retrieve public events:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not retrieve events.',
    })
  }
})

// PUBLIC: ONE PUBLISHED EVENT
app.get('/api/events/:id', async (req, res) => {
  try {
    const eventId = Number(req.params.id)

    if (!Number.isSafeInteger(eventId) || eventId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID.',
      })
    }

    const result = await pool.query(
      `SELECT ${eventSelect}
       FROM events e
       JOIN users u ON u.id = e.organizer_id
       WHERE e.id = $1 AND e.status = 'published'
       LIMIT 1`,
      [eventId]
    )

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Published event not found.',
      })
    }

    res.json({
      success: true,
      event: result.rows[0],
    })
  } catch (error) {
    console.error('Failed to retrieve event:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not retrieve event details.',
    })
  }
})

// CREATE EVENT AS DRAFT
app.post(
  '/api/events',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const {
        title,
        description = '',
        category = '',
        venue,
        event_date,
        start_time,
        capacity,
        price_type = 'free',
        price = null,
        payment_instructions = '',
        target_audience,
      } = req.body || {}

      if (
        typeof title !== 'string' ||
        !title.trim() ||
        title.trim().length > 200
      ) {
        return res.status(400).json({
          success: false,
          message: 'Event title is required and must be at most 200 characters.',
        })
      }

      if (
        typeof venue !== 'string' ||
        !venue.trim() ||
        venue.trim().length > 200
      ) {
        return res.status(400).json({
          success: false,
          message: 'Venue is required and must be at most 200 characters.',
        })
      }

      if (
        typeof event_date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(event_date)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid date in YYYY-MM-DD format.',
        })
      }

      const parsedDate = new Date(`${event_date}T00:00:00.000Z`)

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== event_date
      ) {
        return res.status(400).json({
          success: false,
          message: 'The event date is not a valid calendar date.',
        })
      }

      if (
        typeof start_time !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(start_time)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid start time, such as 09:30.',
        })
      }

      if (
        !Number.isSafeInteger(capacity) ||
        capacity < 1 ||
        capacity > 1000000
      ) {
        return res.status(400).json({
          success: false,
          message: 'Capacity must be a whole number between 1 and 1,000,000.',
        })
      }

      if (
        typeof description !== 'string' ||
        description.length > 10000 ||
        typeof category !== 'string' ||
        category.length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: 'Description or category is too long or invalid.',
        })
      }

      const pricingError = validatePricing({
        price_type,
        price,
        payment_instructions,
      })

      if (pricingError) {
        return res.status(400).json({
          success: false,
          message: pricingError,
        })
      }

      const audienceResult = validateAudienceTags(target_audience)

      if (audienceResult.error) {
        return res.status(400).json({
          success: false,
          message: audienceResult.error,
        })
      }

      const targetingResult = validateTargeting(req.body)

      if (targetingResult.error) {
        return res.status(400).json({
          success: false,
          message: targetingResult.error,
        })
      }

      const result = await pool.query(
        `INSERT INTO events
         (organizer_id, title, description, category, venue,
          event_date, start_time, capacity, status,
          price_type, price, payment_instructions,
          target_audience, target_age_ranges, target_experience)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10, $11, $12, $13, $14)
         RETURNING id, organizer_id, title, description, category, venue,
                   event_date, start_time, capacity, status,
                   price_type, price, currency, payment_instructions,
                   target_audience, target_age_ranges, target_experience,
                   created_at`,
        [
          req.auth.userId,
          title.trim(),
          description.trim(),
          category.trim(),
          venue.trim(),
          event_date,
          start_time,
          capacity,
          price_type,
          price_type === 'paid' ? Number(price) : null,
          price_type === 'paid' ? payment_instructions.trim() : null,
          audienceResult.value,
          targetingResult.age_ranges,
          targetingResult.experience,
        ]
      )

      res.status(201).json({
        success: true,
        message: 'Event created as a draft.',
        event: result.rows[0],
      })
    } catch (error) {
      console.error('Event creation failed:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not create the event.',
      })
    }
  }
)

// PARTICIPANT: REGISTER FOR A PUBLISHED EVENT (WEB, LOGGED-IN)
app.post(
  '/api/events/:id/register',
  requireAuth,
  requireRole('participant'),
  async (req, res) => {
    const client = await pool.connect()

    try {
      const eventId = Number(req.params.id)

      if (!Number.isSafeInteger(eventId) || eventId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid event ID.',
        })
      }

      const { full_name, email, phone, payment_reference } = req.body || {}

      if (
        typeof full_name !== 'string' ||
        !full_name.trim() ||
        full_name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: 'Enter a full name of up to 100 characters.',
        })
      }

      if (
        typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address.',
        })
      }

      if (
        typeof phone !== 'string' ||
        !/^[0-9+()\-\s]{7,20}$/.test(phone.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid phone number.',
        })
      }

      await client.query('BEGIN')

      const eventResult = await client.query(
        `SELECT id, capacity, status, price_type
         FROM events
         WHERE id = $1
         FOR UPDATE`,
        [eventId]
      )

      const event = eventResult.rows[0]

      if (!event) {
        await client.query('ROLLBACK')
        return res.status(404).json({
          success: false,
          message: 'Event not found.',
        })
      }

      if (event.status !== 'published') {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          message: 'This event is not open for registration.',
        })
      }

      if (
        event.price_type === 'paid' &&
        (typeof payment_reference !== 'string' || !payment_reference.trim())
      ) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          message: 'Enter your Mobile Money transaction code to register for this paid event.',
        })
      }

      const countResult = await client.query(
        `SELECT COUNT(*)::integer AS count
         FROM registrations
         WHERE event_id = $1`,
        [eventId]
      )

      if (countResult.rows[0].count >= event.capacity) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          success: false,
          message: 'This event is already full.',
        })
      }

      const paymentStatus = event.price_type === 'paid' ? 'pending' : 'not_required'

      const insertResult = await client.query(
        `INSERT INTO registrations
           (event_id, participant_id, status, full_name, email, phone,
            payment_status, payment_reference)
         VALUES ($1, $2, 'registered', $3, $4, $5, $6, $7)
         RETURNING id, event_id, participant_id, status,
                   full_name, email, phone, payment_status,
                   payment_reference, registered_at`,
        [
          eventId,
          req.auth.userId,
          full_name.trim(),
          email.trim(),
          phone.trim(),
          paymentStatus,
          event.price_type === 'paid' ? payment_reference.trim() : null,
        ]
      )

      await client.query('COMMIT')

      res.status(201).json({
        success: true,
        message: event.price_type === 'paid'
          ? 'Registered! Your payment will be verified by the organizer shortly.'
          : 'You have successfully registered for this event.',
        registration: insertResult.rows[0],
      })
    } catch (error) {
      await client.query('ROLLBACK')

      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'You are already registered for this event.',
        })
      }

      console.error('Event registration failed:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not complete your registration.',
      })
    } finally {
      client.release()
    }
  }
)

// USSD: SIMPLE PHONE-BASED REGISTRATION CHANNEL (Africa's Talking webhook)
// No login needed — identified only by the phone number dialing in.
async function saveUssdRegistration({ eventId, fullName, phone, paymentReference, isPaid }) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const eventResult = await client.query(
      `SELECT id, capacity, status FROM events WHERE id = $1 FOR UPDATE`,
      [eventId]
    )

    const event = eventResult.rows[0]

    if (!event || event.status !== 'published') {
      await client.query('ROLLBACK')
      return { success: false, message: 'This event is not available for registration.' }
    }

    const dupeCheck = await client.query(
      `SELECT id FROM registrations WHERE event_id = $1 AND phone = $2`,
      [eventId, phone]
    )

    if (dupeCheck.rows[0]) {
      await client.query('ROLLBACK')
      return { success: false, message: 'You are already registered for this event.' }
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::integer AS count FROM registrations WHERE event_id = $1`,
      [eventId]
    )

    if (countResult.rows[0].count >= event.capacity) {
      await client.query('ROLLBACK')
      return { success: false, message: 'This event is already full.' }
    }

    await client.query(
      `INSERT INTO registrations
         (event_id, participant_id, status, full_name, phone,
          payment_status, payment_reference)
       VALUES ($1, NULL, 'registered', $2, $3, $4, $5)`,
      [
        eventId,
        fullName.trim().slice(0, 100),
        phone,
        isPaid ? 'pending' : 'not_required',
        paymentReference,
      ]
    )

    await client.query('COMMIT')
    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('USSD registration failed:', error.message)
    return { success: false, message: 'Could not complete registration. Please try again.' }
  } finally {
    client.release()
  }
}

app.post('/api/ussd', async (req, res) => {
  res.set('Content-Type', 'text/plain')

  try {
    const { phoneNumber, text = '' } = req.body || {}
    const input = String(text || '').split('*').filter(Boolean)
    let response = ''

    const eventsQuery = () =>
      pool.query(
        `SELECT id, title, event_date, start_time, venue, capacity,
                price_type, price, currency, payment_instructions
         FROM events
         WHERE status = 'published'
         ORDER BY event_date ASC
         LIMIT 5`
      )

    // MAIN MENU
    if (input.length === 0) {
      response = 'CON Welcome to Gada Events\n1. Browse events\n2. My registrations'

    // EVENTS LIST
    } else if (input[0] === '1' && input.length === 1) {
      const result = await eventsQuery()

      if (result.rows.length === 0) {
        response = 'END No upcoming events at the moment.'
      } else {
        const lines = result.rows
          .map((event, index) => `${index + 1}. ${event.title}`)
          .join('\n')
        response = `CON Upcoming events:\n${lines}`
      }

    // EVENT DETAIL
    } else if (input[0] === '1' && input.length === 2) {
      const result = await eventsQuery()
      const event = result.rows[Number(input[1]) - 1]

      if (!event) {
        response = 'END Invalid selection.'
      } else {
        const dateText = new Date(`${String(event.event_date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        })
        const priceText = event.price_type === 'paid'
          ? `${event.currency} ${event.price}`
          : 'Free'

        response = `CON ${event.title}\n${dateText}, ${String(event.start_time).slice(0, 5)}\n${event.venue}\nPrice: ${priceText}\n1. Register\n0. Back`
      }

    // ASK FOR NAME
    } else if (input[0] === '1' && input.length === 3 && input[2] === '1') {
      response = 'CON Your name and phone number are shared only with this event\'s organizer.\nEnter your full name:'

    // AFTER NAME: free events finish here, paid events ask for payment code
    } else if (input[0] === '1' && input.length === 4 && input[2] === '1') {
      const result = await eventsQuery()
      const event = result.rows[Number(input[1]) - 1]
      const fullName = input[3]

      if (!event) {
        response = 'END Invalid selection.'
      } else if (event.price_type === 'paid') {
        response = `CON Pay ${event.currency} ${event.price} via Mobile Money.\n${event.payment_instructions || 'Contact the organizer for payment details.'}\nEnter your MoMo transaction code:`
      } else {
        const saved = await saveUssdRegistration({
          eventId: event.id,
          fullName,
          phone: phoneNumber,
          paymentReference: null,
          isPaid: false,
        })

        response = saved.success
          ? `END You're registered for ${event.title}! See you there.`
          : `END ${saved.message}`
      }

    // AFTER PAYMENT CODE: finish paid registration
    } else if (input[0] === '1' && input.length === 5 && input[2] === '1') {
      const result = await eventsQuery()
      const event = result.rows[Number(input[1]) - 1]
      const fullName = input[3]
      const paymentReference = input[4]

      if (!event) {
        response = 'END Invalid selection.'
      } else {
        const saved = await saveUssdRegistration({
          eventId: event.id,
          fullName,
          phone: phoneNumber,
          paymentReference,
          isPaid: true,
        })

        response = saved.success
          ? `END Registered for ${event.title}! Your payment will be verified by the organizer.`
          : `END ${saved.message}`
      }

    // MY REGISTRATIONS (looked up by phone number, no login needed)
    } else if (input[0] === '2') {
      const result = await pool.query(
        `SELECT e.title, r.payment_status
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE r.phone = $1
         ORDER BY r.registered_at DESC
         LIMIT 5`,
        [phoneNumber]
      )

      if (result.rows.length === 0) {
        response = 'END You have no registrations yet.'
      } else {
        const lines = result.rows
          .map((row) => {
            const label =
              row.payment_status === 'pending' ? ' (payment pending)'
              : row.payment_status === 'paid' ? ' (paid)'
              : ''
            return `- ${row.title}${label}`
          })
          .join('\n')
        response = `END Your registrations:\n${lines}`
      }

    } else {
      response = 'END Invalid input. Please try again.'
    }

    res.send(response)
  } catch (error) {
    console.error('USSD handler failed:', error.message)
    res.send('END Something went wrong. Please try again later.')
  }
})

// UPDATE OWN EVENT: DRAFT OR PUBLISHED
app.patch(
  '/api/events/:id',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id)

      if (!Number.isSafeInteger(eventId) || eventId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid event ID.',
        })
      }

      const {
        title,
        description = '',
        category = '',
        venue,
        event_date,
        start_time,
        capacity,
        price_type = 'free',
        price = null,
        payment_instructions = '',
        target_audience,
      } = req.body || {}

      if (
        typeof title !== 'string' ||
        !title.trim() ||
        title.trim().length > 200
      ) {
        return res.status(400).json({
          success: false,
          message: 'Event title is required and must be at most 200 characters.',
        })
      }

      if (
        typeof venue !== 'string' ||
        !venue.trim() ||
        venue.trim().length > 200
      ) {
        return res.status(400).json({
          success: false,
          message: 'Venue is required and must be at most 200 characters.',
        })
      }

      if (
        typeof event_date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(event_date)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid date in YYYY-MM-DD format.',
        })
      }

      const parsedDate = new Date(`${event_date}T00:00:00.000Z`)

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== event_date
      ) {
        return res.status(400).json({
          success: false,
          message: 'The event date is not a valid calendar date.',
        })
      }

      if (
        typeof start_time !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(start_time)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid start time, such as 09:30.',
        })
      }

      if (
        !Number.isSafeInteger(capacity) ||
        capacity < 1 ||
        capacity > 1000000
      ) {
        return res.status(400).json({
          success: false,
          message: 'Capacity must be a whole number between 1 and 1,000,000.',
        })
      }

      if (
        typeof description !== 'string' ||
        description.length > 10000 ||
        typeof category !== 'string' ||
        category.length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: 'Description or category is too long or invalid.',
        })
      }

      const pricingError = validatePricing({
        price_type,
        price,
        payment_instructions,
      })

      if (pricingError) {
        return res.status(400).json({
          success: false,
          message: pricingError,
        })
      }

      const audienceResult = validateAudienceTags(target_audience)

      if (audienceResult.error) {
        return res.status(400).json({
          success: false,
          message: audienceResult.error,
        })
      }

      const targetingResult = validateTargeting(req.body)

      if (targetingResult.error) {
        return res.status(400).json({
          success: false,
          message: targetingResult.error,
        })
      }

      const result = await pool.query(
        `UPDATE events
         SET title = $1,
             description = $2,
             category = $3,
             venue = $4,
             event_date = $5,
             start_time = $6,
             capacity = $7,
             price_type = $8,
             price = $9,
             payment_instructions = $10,
             target_audience = $11,
             target_age_ranges = $12,
             target_experience = $13
         WHERE id = $14
           AND organizer_id = $15
         RETURNING id, organizer_id, title, description, category,
                   venue, event_date, start_time, capacity, status,
                   price_type, price, currency, payment_instructions,
                   target_audience, target_age_ranges, target_experience,
                   created_at`,
        [
          title.trim(),
          description.trim(),
          category.trim(),
          venue.trim(),
          event_date,
          start_time,
          capacity,
          price_type,
          price_type === 'paid' ? Number(price) : null,
          price_type === 'paid' ? payment_instructions.trim() : null,
          audienceResult.value,
          targetingResult.age_ranges,
          targetingResult.experience,
          eventId,
          req.auth.userId,
        ]
      )

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Event not found, or you do not have permission to edit it.',
        })
      }

      return res.json({
        success: true,
        message: 'Event details updated successfully.',
        event: result.rows[0],
      })
    } catch (error) {
      console.error('Event update failed:', error.message)

      return res.status(500).json({
        success: false,
        message: 'Could not update the event.',
      })
    }
  }
)

// PUBLISH OWN DRAFT
app.patch(
  '/api/events/:id/publish',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id)

      if (!Number.isSafeInteger(eventId) || eventId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid event ID.',
        })
      }

      const result = await pool.query(
        `UPDATE events
         SET status = 'published'
         WHERE id = $1
           AND organizer_id = $2
           AND status = 'draft'
         RETURNING id, organizer_id, title, description, category, venue,
                   event_date, start_time, capacity, status, created_at`,
        [eventId, req.auth.userId]
      )

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Draft event not found, or you do not have permission to publish it.',
        })
      }

      res.json({
        success: true,
        message: 'Event published successfully.',
        event: result.rows[0],
      })
    } catch (error) {
      console.error('Event publishing failed:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not publish the event.',
      })
    }
  }
)

// DELETE OWN EVENT
app.delete(
  '/api/events/:id',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id)

      if (!Number.isSafeInteger(eventId) || eventId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid event ID.',
        })
      }

      const result = await pool.query(
        `DELETE FROM events
         WHERE id = $1 AND organizer_id = $2
         RETURNING id`,
        [eventId, req.auth.userId]
      )

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Event not found, or you do not have permission to remove it.',
        })
      }

      res.json({
        success: true,
        message: 'Event removed.',
      })
    } catch (error) {
      console.error('Event deletion failed:', error.message)

      if (error.code === '23503') {
        return res.status(409).json({
          success: false,
          message: 'This event has related registrations and cannot be deleted.',
        })
      }

      res.status(500).json({
        success: false,
        message: 'Could not remove the event.',
      })
    }
  }
)

// ORGANIZER: EVENTS, REGISTRATION ANALYTICS, ESTIMATED ATTENDANCE,
// AND AUDIENCE-MATCH (how well actual registrants fit the target audience)
app.get(
  '/api/organizer/events',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const result = await pool.query(
        `WITH participant_rates AS (
           SELECT participant_id,
                  AVG(CASE WHEN attended THEN 1 ELSE 0 END)::numeric AS attendance_rate
           FROM registrations
           WHERE participant_id IS NOT NULL AND attended IS NOT NULL
           GROUP BY participant_id
         )
         SELECT
           ${eventSelect},
           COUNT(r.id)::integer AS registrations,
           GREATEST(
             e.capacity - COUNT(r.id)::integer,
             0
           ) AS available_spots,
           CASE
             WHEN e.capacity > 0 THEN
               ROUND(COUNT(r.id)::numeric * 100 / e.capacity, 1)
             ELSE 0
           END AS capacity_used_percent,
           COALESCE(
             SUM(
               COALESCE(
                 pr.attendance_rate,
                 CASE WHEN r.payment_status = 'paid' THEN 0.85 ELSE 0.65 END
               )
             ),
             0
           )::numeric(10,1) AS estimated_attendance,
           COUNT(r.participant_id) AS registrations_with_account,
           (SELECT COUNT(*) FROM event_feedback f WHERE f.event_id = e.id)::integer AS feedback_count,
           (SELECT ROUND(AVG(f.rating)::numeric, 1) FROM event_feedback f WHERE f.event_id = e.id) AS average_rating,
           COUNT(
             CASE
               WHEN array_length(e.target_audience, 1) > 0
                 AND p.interests && e.target_audience
               THEN 1
             END
           ) AS audience_match_count
         FROM events e
         JOIN users u ON u.id = e.organizer_id
         LEFT JOIN registrations r ON r.event_id = e.id
         LEFT JOIN participant_rates pr ON pr.participant_id = r.participant_id
         LEFT JOIN users p ON p.id = r.participant_id
         WHERE e.organizer_id = $1
         GROUP BY e.id, u.id
         ORDER BY e.created_at DESC`,
        [req.auth.userId]
      )

      const profilesResult = await pool.query(
        `SELECT r.event_id, p.interests, p.age_range, p.experience_level
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         JOIN users p ON p.id = r.participant_id
         WHERE e.organizer_id = $1`,
        [req.auth.userId]
      )

      const profilesByEvent = new Map()
      for (const row of profilesResult.rows) {
        if (!profilesByEvent.has(row.event_id)) profilesByEvent.set(row.event_id, [])
        profilesByEvent.get(row.event_id).push(row)
      }

      const events = result.rows.map((event) => {
        const scores = (profilesByEvent.get(event.id) || []).map((profile) =>
          computeMatchScore(event, profile)
        )

        const averageScore = scores.length > 0
          ? scores.reduce((sum, value) => sum + value, 0) / scores.length
          : null

        return {
          ...event,
          estimated_attendance: Math.round(Number(event.estimated_attendance || 0)),
          audience_match_percent:
            hasTargeting(event) && averageScore !== null
              ? Math.round(averageScore)
              : null,
        }
      })

      const totalRegistrations = events.reduce(
        (sum, event) => sum + Number(event.registrations || 0),
        0
      )

      const totalCapacity = events.reduce(
        (sum, event) => sum + Number(event.capacity || 0),
        0
      )

      const totalEstimatedAttendance = events.reduce(
        (sum, event) => sum + Number(event.estimated_attendance || 0),
        0
      )

      const publishedEvents = events.filter(
        (event) => event.status === 'published'
      ).length

      const analytics = {
        totalEvents: events.length,
        publishedEvents,
        totalRegistrations,
        totalCapacity,
        availableSpots: Math.max(totalCapacity - totalRegistrations, 0),
        capacityUsedPercent: totalCapacity > 0
          ? Number(((totalRegistrations / totalCapacity) * 100).toFixed(1))
          : 0,
        estimatedAttendance: totalEstimatedAttendance,
        estimatedShowUpRate: totalRegistrations > 0
          ? Number(((totalEstimatedAttendance / totalRegistrations) * 100).toFixed(1))
          : 0,
      }

      return res.json({
        success: true,
        count: events.length,
        analytics,
        events,
      })
    } catch (error) {
      console.error('Failed to retrieve organizer analytics:', error.message)

      return res.status(500).json({
        success: false,
        message: 'Could not retrieve your event analytics.',
      })
    }
  }
)

// ORGANIZER: MARK WHETHER A REGISTRANT ACTUALLY ATTENDED
// (this is what teaches the attendance-estimate model over time)
app.patch(
  '/api/registrations/:id/attendance',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const registrationId = Number(req.params.id)
      const { attended } = req.body || {}

      if (!Number.isSafeInteger(registrationId) || registrationId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid registration ID.',
        })
      }

      if (typeof attended !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Attended must be true or false.',
        })
      }

      const result = await pool.query(
        `UPDATE registrations r
         SET attended = $1
         FROM events e
         WHERE r.id = $2
           AND r.event_id = e.id
           AND e.organizer_id = $3
         RETURNING r.id, r.full_name, r.attended`,
        [attended, registrationId, req.auth.userId]
      )

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Registration not found, or you do not have permission to update it.',
        })
      }

      res.json({
        success: true,
        message: 'Attendance updated.',
        registration: result.rows[0],
      })
    } catch (error) {
      console.error('Attendance update failed:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not update attendance.',
      })
    }
  }
)

// PARTICIPANT: UPDATE OWN INTERESTS (used for recommendations + audience matching)
app.patch(
  '/api/participant/profile',
  requireAuth,
  requireRole('participant'),
  async (req, res) => {
    try {
      const { interests, age_range = '', experience_level = '' } = req.body || {}
      const audienceResult = validateAudienceTags(interests)

      if (audienceResult.error) {
        return res.status(400).json({
          success: false,
          message: audienceResult.error,
        })
      }

      if (age_range && !AGE_RANGES.includes(age_range)) {
        return res.status(400).json({
          success: false,
          message: 'Choose a valid age range.',
        })
      }

      if (experience_level && !EXPERIENCE_LEVELS.includes(experience_level)) {
        return res.status(400).json({
          success: false,
          message: 'Choose a valid experience level.',
        })
      }

      const result = await pool.query(
        `UPDATE users
         SET interests = $1,
             age_range = $2,
             experience_level = $3
         WHERE id = $4 AND role = 'participant'
         RETURNING id, name, email, role, created_at,
                   interests, age_range, experience_level`,
        [
          audienceResult.value,
          age_range || null,
          experience_level || null,
          req.auth.userId,
        ]
      )

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Participant account not found.',
        })
      }

      res.json({
        success: true,
        message: 'Your profile has been saved.',
        user: publicUser(result.rows[0]),
      })
    } catch (error) {
      console.error('Interests update failed:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not save your interests.',
      })
    }
  }
)

app.get('/api/audience-tags', (req, res) => {
  res.json({
    success: true,
    tags: AUDIENCE_TAGS,
    age_ranges: AGE_RANGES,
    experience_levels: EXPERIENCE_LEVELS,
  })
})

// PARTICIPANT: UPCOMING EVENTS RANKED BY HOW WELL THEY MATCH THE PROFILE
app.get(
  '/api/recommendations',
  requireAuth,
  requireRole('participant'),
  async (req, res) => {
    try {
      const profileResult = await pool.query(
        `SELECT interests, age_range, experience_level
         FROM users
         WHERE id = $1`,
        [req.auth.userId]
      )

      const profile = profileResult.rows[0] || {}

      const eventsResult = await pool.query(
        `SELECT ${eventSelect}
         FROM events e
         JOIN users u ON u.id = e.organizer_id
         WHERE e.status = 'published'
           AND e.event_date >= CURRENT_DATE
           AND NOT EXISTS (
             SELECT 1 FROM registrations r
             WHERE r.event_id = e.id AND r.participant_id = $1
           )
         ORDER BY e.event_date ASC, e.start_time ASC`,
        [req.auth.userId]
      )

      const recommendations = eventsResult.rows
        .map((event) => ({ ...event, match_score: computeMatchScore(event, profile) }))
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 6)

      res.json({
        success: true,
        profile: {
          interests: profile.interests || [],
          age_range: profile.age_range || '',
          experience_level: profile.experience_level || '',
        },
        profile_complete: Boolean(
          (profile.interests || []).length > 0 &&
          profile.age_range &&
          profile.experience_level
        ),
        recommendations,
      })
    } catch (error) {
      console.error('Recommendations failed:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not load recommendations.',
      })
    }
  }
)

// ORGANIZER: REGISTRATIONS FOR ONE OF THEIR EVENTS (for confirming payments)
app.get(
  '/api/organizer/events/:id/registrations',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id)

      if (!Number.isSafeInteger(eventId) || eventId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid event ID.',
        })
      }

      const ownershipCheck = await pool.query(
        `SELECT id, title, price_type FROM events
         WHERE id = $1 AND organizer_id = $2
         LIMIT 1`,
        [eventId, req.auth.userId]
      )

      if (!ownershipCheck.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Event not found, or you do not have permission to view it.',
        })
      }

      const result = await pool.query(
        `SELECT id, full_name, email, phone, status,
                payment_status, payment_reference, attended, registered_at
         FROM registrations
         WHERE event_id = $1
         ORDER BY registered_at DESC`,
        [eventId]
      )

      res.json({
        success: true,
        event: ownershipCheck.rows[0],
        registrations: result.rows,
      })
    } catch (error) {
      console.error('Failed to retrieve registrations:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not retrieve registrations for this event.',
      })
    }
  }
)

// ORGANIZER: CONFIRM A PENDING PAYMENT
app.patch(
  '/api/registrations/:id/confirm-payment',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const registrationId = Number(req.params.id)

      if (!Number.isSafeInteger(registrationId) || registrationId < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid registration ID.',
        })
      }

      const result = await pool.query(
        `UPDATE registrations r
         SET payment_status = 'paid'
         FROM events e
         WHERE r.id = $1
           AND r.event_id = e.id
           AND e.organizer_id = $2
         RETURNING r.id, r.full_name, r.payment_status`,
        [registrationId, req.auth.userId]
      )

      if (!result.rows[0]) {
        return res.status(404).json({
          success: false,
          message: 'Registration not found, or you do not have permission to confirm it.',
        })
      }

      res.json({
        success: true,
        message: 'Payment confirmed.',
        registration: result.rows[0],
      })
    } catch (error) {
      console.error('Payment confirmation failed:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not confirm payment.',
      })
    }
  }
)

// ORGANIZER ACCESS CHECK
app.get(
  '/api/organizer/me',
  requireAuth,
  requireRole('organizer'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Organizer access verified.',
      userId: req.auth.userId,
    })
  }
)

// PARTICIPANT: MY REGISTRATIONS
app.get(
  '/api/participant/registrations',
  requireAuth,
  requireRole('participant'),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           r.id AS registration_id,
           r.status AS registration_status,
           r.payment_status,
           r.payment_reference,
           e.id,
           e.title,
           e.description,
           e.category,
           e.venue,
           e.event_date,
           e.start_time,
           e.price_type,
           e.price,
           e.currency,
           e.event_date <= (NOW() AT TIME ZONE 'Africa/Kigali')::date AS event_has_started,
           f.rating AS feedback_rating,
           f.liked AS feedback_liked,
           f.improve AS feedback_improve,
           f.want_next AS feedback_want_next
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         LEFT JOIN event_feedback f ON f.event_id = e.id AND f.participant_id = r.participant_id
         WHERE r.participant_id = $1
         ORDER BY e.event_date ASC, e.start_time ASC`,
        [req.auth.userId]
      )

      res.json({
        success: true,
        count: result.rows.length,
        registrations: result.rows,
      })
    } catch (error) {
      console.error('Failed to retrieve participant registrations:', error.message)
      res.status(500).json({
        success: false,
        message: 'Could not retrieve your registrations.',
      })
    }
  }
)

// ---------------- POST-EVENT FEEDBACK & INSIGHTS ----------------

function cleanFeedbackText(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, 500) : null
}

// PARTICIPANT: LEAVE OR UPDATE FEEDBACK FOR AN EVENT THEY REGISTERED FOR
app.post(
  '/api/events/:id/feedback',
  requireAuth,
  requireRole('participant'),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id)
      const rating = Number(req.body?.rating)

      if (!Number.isSafeInteger(eventId) || eventId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid event ID.' })
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Choose a rating from 1 to 5 stars.' })
      }

      const check = await pool.query(
        `SELECT e.event_date <= (NOW() AT TIME ZONE 'Africa/Kigali')::date AS started
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE r.event_id = $1 AND r.participant_id = $2
         LIMIT 1`,
        [eventId, req.auth.userId]
      )

      if (!check.rows[0]) {
        return res.status(403).json({
          success: false,
          message: 'Only people registered for this event can leave feedback.',
        })
      }

      if (!check.rows[0].started) {
        return res.status(400).json({
          success: false,
          message: 'You can leave feedback once the event has taken place.',
        })
      }

      await pool.query(
        `INSERT INTO event_feedback (event_id, participant_id, rating, liked, improve, want_next)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (event_id, participant_id) DO UPDATE
         SET rating = EXCLUDED.rating,
             liked = EXCLUDED.liked,
             improve = EXCLUDED.improve,
             want_next = EXCLUDED.want_next,
             created_at = NOW()`,
        [
          eventId,
          req.auth.userId,
          rating,
          cleanFeedbackText(req.body?.liked),
          cleanFeedbackText(req.body?.improve),
          cleanFeedbackText(req.body?.want_next),
        ]
      )

      res.json({ success: true, message: 'Thank you! Your feedback was sent to the organizer.' })
    } catch (error) {
      console.error('Failed to save feedback:', error.message)
      res.status(500).json({ success: false, message: 'Could not save your feedback.' })
    }
  }
)

async function loadOwnedEventFeedback(eventId, organizerId) {
  const owned = await pool.query(
    'SELECT id, title FROM events WHERE id = $1 AND organizer_id = $2 LIMIT 1',
    [eventId, organizerId]
  )

  if (!owned.rows[0]) return null

  // Anonymous on purpose: organizers see what was said, not who said it.
  const feedback = await pool.query(
    `SELECT rating, liked, improve, want_next, created_at
     FROM event_feedback
     WHERE event_id = $1
     ORDER BY created_at DESC`,
    [eventId]
  )

  return { event: owned.rows[0], feedback: feedback.rows }
}

// ORGANIZER: SEE ANONYMOUS FEEDBACK AND THE LATEST SUMMARY FOR ONE OF THEIR EVENTS
app.get(
  '/api/organizer/events/:id/feedback',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id)

      if (!Number.isSafeInteger(eventId) || eventId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid event ID.' })
      }

      const data = await loadOwnedEventFeedback(eventId, req.auth.userId)

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Event not found, or you do not have permission to view it.',
        })
      }

      const saved = await pool.query(
        'SELECT insights, source, feedback_count, generated_at FROM event_insights WHERE event_id = $1',
        [eventId]
      )

      const distribution = [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: data.feedback.filter((row) => Number(row.rating) === stars).length,
      }))

      res.json({
        success: true,
        event: data.event,
        ...feedbackStats(data.feedback),
        distribution,
        feedback: data.feedback,
        insights: saved.rows[0]
          ? { ...saved.rows[0], outdated: saved.rows[0].feedback_count !== data.feedback.length }
          : null,
      })
    } catch (error) {
      console.error('Failed to load feedback:', error.message)
      res.status(500).json({ success: false, message: 'Could not load feedback for this event.' })
    }
  }
)

// ORGANIZER: GENERATE A NEW AI SUMMARY OF THE FEEDBACK
app.post(
  '/api/organizer/events/:id/insights',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const eventId = Number(req.params.id)

      if (!Number.isSafeInteger(eventId) || eventId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid event ID.' })
      }

      const data = await loadOwnedEventFeedback(eventId, req.auth.userId)

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Event not found, or you do not have permission to view it.',
        })
      }

      if (data.feedback.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'There is no feedback to summarise yet.',
        })
      }

      const { source, insights } = await generateInsights(data.event.title, data.feedback)

      const saved = await pool.query(
        `INSERT INTO event_insights (event_id, insights, source, feedback_count, generated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (event_id) DO UPDATE
         SET insights = EXCLUDED.insights,
             source = EXCLUDED.source,
             feedback_count = EXCLUDED.feedback_count,
             generated_at = NOW()
         RETURNING insights, source, feedback_count, generated_at`,
        [eventId, JSON.stringify(insights), source, data.feedback.length]
      )

      res.json({ success: true, insights: { ...saved.rows[0], outdated: false } })
    } catch (error) {
      console.error('Failed to generate insights:', error.message)
      res.status(500).json({ success: false, message: 'Could not summarise the feedback right now.' })
    }
  }
)

app.get('/api/test-route', (req, res) => {
  res.json({ success: true, message: 'Gada API route is working!' })
})

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found.',
  })
})

// START SERVER

console.log('About to start Gada API...')

async function ensureSchema() {
  // Creates any missing tables or columns so a fresh database (for example on
  // Render) is ready on first start. Set AUTO_MIGRATE=false to skip.
  if (process.env.AUTO_MIGRATE === 'false') return
  const fs = require('fs')
  const path = require('path')
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8')
  await pool.query(sql)
  console.log('Database schema checked.')
}

let server

ensureSchema()
  .catch((error) => {
    console.error('Schema check failed:', error.message)
  })
  .finally(() => {
    server = app.listen(PORT, () => {
      console.log(`Gada Events API running on port ${PORT}`)
    })

    server.on('error', (error) => {
      console.error('Gada server error:', error)
    })
  })

process.on('exit', (code) => {
  console.log('Node process exiting with code:', code)
})