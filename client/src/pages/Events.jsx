import { Link } from 'react-router-dom'
import '../App.css'

function Events() {
  const events = [
    {
      date: '20',
      month: 'OCT',
      category: 'Technology',
      title: 'Tech & Innovation Summit',
      location: 'Kigali Convention Centre',
      time: '9:00 AM',
      description:
        'Connect with innovators, technology professionals, and entrepreneurs exploring the future of technology.',
    },
    {
      date: '24',
      month: 'OCT',
      category: 'Business',
      title: 'Young Entrepreneurs Meetup',
      location: 'Norrsken House Kigali',
      time: '2:00 PM',
      description:
        'Meet young entrepreneurs, exchange ideas, and discover new opportunities for collaboration.',
    },
    {
      date: '31',
      month: 'OCT',
      category: 'Community',
      title: 'Kigali Community Day',
      location: 'Kigali City',
      time: '11:00 AM',
      description:
        'A community gathering bringing people together for conversations, activities, and connection.',
    },
    {
      date: '05',
      month: 'NOV',
      category: 'Creative',
      title: 'Creative Arts Showcase',
      location: 'Kigali Arts Centre',
      time: '4:00 PM',
      description:
        'Discover local creative talent through an evening of art, design, music, and storytelling.',
    },
    {
      date: '08',
      month: 'NOV',
      category: 'Education',
      title: 'Future Skills Workshop',
      location: 'Kigali Innovation City',
      time: '10:00 AM',
      description:
        'A practical workshop focused on building skills for the changing world of work.',
    },
    {
      date: '15',
      month: 'NOV',
      category: 'Networking',
      title: 'Kigali Networking Night',
      location: 'Kigali Heights',
      time: '6:00 PM',
      description:
        'Meet professionals, founders, creatives, and other members of Kigali’s growing community.',
    },
  ]

  return (
    <div className="events-page">
      {/* Navigation */}
      <nav className="navbar">
        <Link to="/" className="brand">
          <div className="brand-icon">G</div>

          <div>
            <span className="brand-name">Gada</span>
            <span className="brand-subtitle">EVENTS</span>
          </div>
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/events" className="active-link">
            Events
          </Link>
          <a href="/#about">About</a>
        </div>

        <div className="nav-actions">
          <button className="login-btn">Login</button>
          <button className="nav-register-btn">Get Started</button>
        </div>
      </nav>

      {/* Page Header */}
      <section className="events-hero">
        <div className="events-hero-content">
          <span className="section-label">EXPLORE GADA</span>

          <h1>
            Find something
            <br />
            <span>worth showing up for.</span>
          </h1>

          <p>
            Explore events happening around Kigali and discover
            experiences, communities, and opportunities that interest you.
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="event-discovery">
        <div className="event-search">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Search events, topics or places..."
          />
        </div>

        <div className="event-filters">
          <button className="filter active-filter">All Events</button>
          <button className="filter">Technology</button>
          <button className="filter">Business</button>
          <button className="filter">Creative</button>
          <button className="filter">Community</button>
          <button className="filter">Education</button>
        </div>
      </section>

      {/* Events */}
      <section className="all-events-section">
        <div className="events-page-heading">
          <div>
            <span className="section-label">UPCOMING</span>
            <h2>Events happening soon</h2>
          </div>

          <span className="event-count">
            {events.length} events
          </span>
        </div>

        <div className="events-page-grid">
          {events.map((event) => (
            <article className="large-event-card" key={event.title}>
              <div className="large-event-cover">
                <span className="large-event-category">
                  {event.category}
                </span>

                <button className="large-save-btn">♡</button>

                <div className="large-date-box">
                  <strong>{event.date}</strong>
                  <span>{event.month}</span>
                </div>
              </div>

              <div className="large-event-content">
                <span className="event-time">
                  {event.month} • {event.time}
                </span>

                <h3>{event.title}</h3>

                <p className="large-event-description">
                  {event.description}
                </p>

                <p className="event-location">
                  📍 {event.location}
                </p>

                <div className="large-event-footer">
                  <span>Open for registration</span>

                  <button className="details-btn">
                    View Details <span>→</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Organizer CTA */}
      <section className="organizer-cta">
        <div>
          <span className="section-label">ARE YOU AN ORGANIZER?</span>

          <h2>Have an event to share?</h2>

          <p>
            Create your event on Gada and make it easier for people
            to discover and register.
          </p>
        </div>

        <button className="cta-button">
          Create an Event →
        </button>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-brand">
          <div className="brand-icon">G</div>

          <div>
            <strong>Gada</strong>
            <span>EVENTS</span>
          </div>
        </div>

        <p>
          © 2026 Gada Events. Discover. Register. Experience.
        </p>

        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/events">Events</Link>
          <a href="/#about">About</a>
        </div>
      </footer>
    </div>
  )
}
export default Events