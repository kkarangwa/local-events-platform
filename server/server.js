
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()
const PORT = Number(process.env.PORT) || 5001
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is missing from server/.env')
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

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
    // Log the reason on the backend, never the token itself.
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
  e.created_at,
  u.name AS organizer_name,
  u.company_name AS organizer_company,
  u.company_website AS organizer_website,
  u.company_email AS organizer_company_email,
  u.company_description AS organizer_company_description
`

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

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'participant',
    } = req.body || {}

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
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
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
              company_description
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
              company_description
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

      const result = await pool.query(
        `INSERT INTO events
         (organizer_id, title, description, category, venue,
          event_date, start_time, capacity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
         RETURNING id, organizer_id, title, description, category, venue,
                   event_date, start_time, capacity, status, created_at`,
        [
          req.auth.userId,
          title.trim(),
          description.trim(),
          category.trim(),
          venue.trim(),
          event_date,
          start_time,
          capacity,
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

      const result = await pool.query(
        `UPDATE events
         SET title = $1,
             description = $2,
             category = $3,
             venue = $4,
             event_date = $5,
             start_time = $6,
             capacity = $7
         WHERE id = $8
           AND organizer_id = $9
         RETURNING id, organizer_id, title, description, category,
                   venue, event_date, start_time, capacity, status,
                   created_at`,
        [
          title.trim(),
          description.trim(),
          category.trim(),
          venue.trim(),
          event_date,
          start_time,
          capacity,
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

 // UPDATE OWN EVENT
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
      } = req.body || {}

      if (
        typeof title !== 'string' ||
        !title.trim() ||
        title.trim().length > 200
      ) {
        return res.status(400).json({
          success: false,
          message: 'Enter an event title of up to 200 characters.',
        })
      }

      if (
        typeof venue !== 'string' ||
        !venue.trim() ||
        venue.trim().length > 200
      ) {
        return res.status(400).json({
          success: false,
          message: 'Enter a venue of up to 200 characters.',
        })
      }

      if (
        typeof event_date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(event_date)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid event date.',
        })
      }

      const parsedDate = new Date(`${event_date}T00:00:00.000Z`)

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== event_date
      ) {
        return res.status(400).json({
          success: false,
          message: 'The event date is invalid.',
        })
      }

      if (
        typeof start_time !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(start_time)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Provide a valid start time.',
        })
      }

      if (
        !Number.isSafeInteger(capacity) ||
        capacity < 1 ||
        capacity > 1000000
      ) {
        return res.status(400).json({
          success: false,
          message: 'Capacity must be between 1 and 1,000,000.',
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
          message: 'Description or category is invalid or too long.',
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
             capacity = $7
         WHERE id = $8
           AND organizer_id = $9
         RETURNING id, organizer_id, title, description, category,
                   venue, event_date, start_time, capacity, status, created_at`,
        [
          title.trim(),
          description.trim(),
          category.trim(),
          venue.trim(),
          event_date,
          start_time,
          capacity,
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

// ORGANIZER: OWN EVENTS AND REGISTRATION COUNTS
app.get(
  '/api/organizer/events',
  requireAuth,
  requireRole('organizer'),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT ${eventSelect},
                COUNT(r.id)::integer AS registrations
         FROM events e
         JOIN users u ON u.id = e.organizer_id
         LEFT JOIN registrations r ON r.event_id = e.id
         WHERE e.organizer_id = $1
         GROUP BY e.id, u.id
         ORDER BY e.created_at DESC`,
        [req.auth.userId]
      )

      res.json({
        success: true,
        count: result.rows.length,
        events: result.rows,
      })
    } catch (error) {
      console.error('Failed to retrieve organizer events:', error.message)

      res.status(500).json({
        success: false,
        message: 'Could not retrieve your events.',
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
           e.id,
           e.title,
           e.category,
           e.event_date,
           e.start_time,
           e.venue,
           r.id AS registration_id,
           r.status AS registration_status
         FROM registrations r
         JOIN events e ON e.id = r.event_id
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

app.get('/api/test-route', (req, res) => {
  res.json({ success: true, message: 'Gada API route is working!' })
})

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
           e.id,
           e.title,
           e.description,
           e.category,
           e.venue,
           e.event_date,
           e.start_time
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE r.participant_id = $1
         ORDER BY e.event_date ASC, e.start_time ASC`,
        [req.auth.userId]
      )

      return res.json({
        success: true,
        registrations: result.rows,
      })
    } catch (error) {
      console.error('Failed to load participant registrations:', error)

      return res.status(500).json({
        success: false,
        message: 'Could not load your registrations.',
      })
    }
  }
)

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found.',
  })
})

// START SERVER

console.log('About to start Gada API...')

const server = app.listen(PORT, () => {
  console.log(`Gada Events API running at http://localhost:${PORT}`)
})

server.on('error', (error) => {
  console.error('Gada server error:', error)
})

process.on('exit', (code) => {
  console.log('Node process exiting with code:', code)
})

