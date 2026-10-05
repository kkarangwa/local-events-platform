import './App.css'

function App() {
  const events = [
    {
      date: '20',
      month: 'OCT',
      category: 'Technology',
      title: 'Tech & Innovation Summit',
      location: 'Kigali Convention Centre',
      time: '9:00 AM',
    },
    {
      date: '24',
      month: 'OCT',
      category: 'Business',
      title: 'Young Entrepreneurs Meetup',
      location: 'Norrsken House Kigali',
      time: '2:00 PM',
    },
    {
      date: '31',
      month: 'OCT',
      category: 'Community',
      title: 'Kigali Community Day',
      location: 'Kigali City',
      time: '11:00 AM',
    },
  ]

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <a href="#home" className="brand">
          <div className="brand-icon">G</div>
          <div>
            <span className="brand-name">Gada</span>
            <span className="brand-subtitle">EVENTS</span>
          </div>
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#events">Events</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          <button className="login-btn">Login</button>
          <button className="nav-register-btn">Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Discover what's happening in Kigali
            </div>

            <h1>
              Your next
              <br />
              <span>experience</span> starts here.
            </h1>

            <p className="hero-description">
              Discover local events, connect with your community, and
              register for experiences that matter to you.
            </p>

            <div className="hero-actions">
              <button className="primary-btn">
                Explore Events
                <span>→</span>
              </button>

              <button className="outline-btn">
                Create an Event
              </button>
            </div>

            <div className="hero-trust">
              <div className="avatar-stack">
                <div>J</div>
                <div>A</div>
                <div>M</div>
                <div>K</div>
              </div>

              <p>
                <strong>Join the community</strong>
                <br />
                Discover events happening around you
              </p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-label">FEATURED EVENT</div>

            <div className="featured-card">
              <div className="featured-top">
                <span className="category-pill">TECHNOLOGY</span>
                <button className="heart-btn">♡</button>
              </div>

              <div className="featured-date">
                <strong>20</strong>
                <span>OCT</span>
              </div>

              <div className="featured-info">
                <p>FRIDAY • 9:00 AM</p>
                <h2>Tech & Innovation Summit</h2>
                <span>📍 Kigali Convention Centre</span>
              </div>

              <div className="featured-footer">
                <span>120+ people interested</span>
                <button>View event →</button>
              </div>
            </div>

            <div className="floating-card floating-one">
              <span>📍</span>
              <div>
                <strong>Kigali</strong>
                <small>Local events</small>
              </div>
            </div>

            <div className="floating-card floating-two">
              <span>✓</span>
              <div>
                <strong>Easy registration</strong>
                <small>Register in seconds</small>
              </div>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="search-section">
          <div className="search-box">
            <div className="search-item">
              <span className="search-icon">⌕</span>
              <div>
                <small>SEARCH</small>
                <p>What are you looking for?</p>
              </div>
            </div>

            <div className="search-divider"></div>

            <div className="search-item">
              <span className="search-icon">◉</span>
              <div>
                <small>LOCATION</small>
                <p>Kigali, Rwanda</p>
              </div>
            </div>

            <button className="search-btn">Search Events</button>
          </div>
        </section>

        {/* Events */}
        <section className="events-section" id="events">
          <div className="section-header">
            <div>
              <span className="section-label">DON'T MISS OUT</span>
              <h2>Upcoming events</h2>
              <p>Find something worth showing up for.</p>
            </div>

            <button className="view-all-btn">
              View all events →
            </button>
          </div>

          <div className="event-grid">
            {events.map((event) => (
              <article className="event-card" key={event.title}>
                <div className="event-cover">
                  <span className="event-category">
                    {event.category}
                  </span>

                  <button className="save-btn">♡</button>

                  <div className="event-date-box">
                    <strong>{event.date}</strong>
                    <span>{event.month}</span>
                  </div>
                </div>

                <div className="event-content">
                  <span className="event-time">
                    {event.month} • {event.time}
                  </span>

                  <h3>{event.title}</h3>

                  <p className="event-location">
                    📍 {event.location}
                  </p>

                  <button className="details-btn">
                    View Details <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="how-section">
          <div className="section-header centered">
            <span className="section-label">HOW IT WORKS</span>
            <h2>Everything in one place.</h2>
            <p>
              From discovering an event to showing up, Gada keeps it simple.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step">
              <div className="step-number">01</div>
              <div className="step-icon">⌕</div>
              <h3>Discover</h3>
              <p>
                Browse events and find experiences that match your interests.
              </p>
            </div>

            <div className="step">
              <div className="step-number">02</div>
              <div className="step-icon">✓</div>
              <h3>Register</h3>
              <p>
                Secure your spot with a simple and straightforward
                registration process.
              </p>
            </div>

            <div className="step">
              <div className="step-number">03</div>
              <div className="step-icon">♡</div>
              <h3>Experience</h3>
              <p>
                Show up, connect with people, and make the most of your event.
              </p>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="about-section" id="about">
          <div className="about-card">
            <div className="about-text">
              <span className="section-label">ABOUT GADA</span>

              <h2>
                Bringing people and local events closer together.
              </h2>

              <p>
                Gada Events is a digital platform designed to make it easier
                for people to discover and register for local events while
                giving organizers a simple way to manage their events and
                participants.
              </p>

              <button className="dark-btn">
                Learn more about Gada →
              </button>
            </div>

            <div className="about-shape">
              <div className="shape-circle"></div>
              <div className="shape-card">
                <span>GADA</span>
                <strong>EVENTS</strong>
                <small>DISCOVER • CONNECT • EXPERIENCE</small>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="footer-brand">
          <div className="brand-icon">G</div>
          <div>
            <strong>Gada</strong>
            <span>EVENTS</span>
          </div>
        </div>

        <p>© 2026 Gada Events. Discover. Register. Experience.</p>

        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#events">Events</a>
          <a href="#about">About</a>
        </div>
      </footer>
    </div>
  )
}

export default App