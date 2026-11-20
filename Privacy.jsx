import { Link } from 'react-router-dom'
import './Privacy.css'

const UPDATED = '16 November 2026'
// Add the team's real contact email here, e.g. 'name@example.com'
const CONTACT_EMAIL = ''

function Privacy() {
  return (
    <main className="privacy-page">
      <header className="privacy-header">
        <Link to="/" className="privacy-brand">
          <span className="privacy-brand-icon">G</span>
          Gada Events
        </Link>
        <Link to="/events" className="privacy-back">Browse events</Link>
      </header>

      <article className="privacy-body">
        <p className="privacy-eyebrow">PRIVACY POLICY</p>
        <h1>How Gada Events uses your information</h1>
        <p className="privacy-updated">Last updated: {UPDATED}</p>

        <p className="privacy-intro">
          Gada Events helps people in Kigali find local events and helps organizers
          manage registrations. This page explains, in plain words, what we collect,
          why, and what you can do about it. It follows Rwanda's Law No. 058/2021
          relating to the protection of personal data and privacy.
        </p>

        <section>
          <h2>1. What we collect</h2>
          <ul>
            <li><strong>Account details:</strong> your name, email address and role (participant or organizer).</li>
            <li><strong>Your password,</strong> stored only as a scrambled hash. Nobody at Gada Events can read it.</li>
            <li><strong>Optional profile details:</strong> interests, age range and experience level, if you choose to add them.</li>
            <li><strong>Registration details:</strong> the name, email or phone number you give when you register for an event.</li>
            <li><strong>Event feedback:</strong> the star rating and comments you choose to leave after an event.</li>
            <li><strong>Organizer details:</strong> company name, website, email and description, if you add them.</li>
          </ul>
          <p>We do not collect your location, contacts, ID number or payment card details.</p>
        </section>

        <section>
          <h2>2. Why we use it</h2>
          <ul>
            <li>To create your account and keep you signed in.</li>
            <li>To register you for events and show your registrations.</li>
            <li>To suggest events that match the interests you chose. Suggestions only change the order of events. Every published event stays open to everyone.</li>
            <li>To show organizers how many people registered and an overall audience-match percentage for their events.</li>
          </ul>
        </section>

        <section>
          <h2>3. Who can see it</h2>
          <ul>
            <li>When you register for an event, that event's organizer sees the name and contact details you gave, so they can manage the event.</li>
            <li>Event feedback reaches the organizer without your name. To summarise it, the comment text (never your name or contact details) may be processed by Google's Gemini AI service.</li>
            <li>Organizers never see your age range or interests one by one. They see a single percentage for the whole event.</li>
            <li>We do not sell your data or share it with advertisers.</li>
            <li>Event pages show a map loaded from Google Maps. When the map loads, Google receives the venue being searched and your device's internet address, under Google's own privacy policy.</li>
          </ul>
        </section>

        <section>
          <h2>4. How we protect it</h2>
          <ul>
            <li>Passwords are hashed with bcrypt and are never sent back by the server.</li>
            <li>Sign-in sessions expire after two hours.</li>
            <li>Each role can only reach its own pages and data. An organizer cannot open another organizer's registrations.</li>
            <li>Data travels over HTTPS, and the database connection is encrypted.</li>
          </ul>
        </section>

        <section>
          <h2>5. Your choices and rights</h2>
          <ul>
            <li><strong>Consent:</strong> we only create your account after you agree to this policy, and we record when you agreed.</li>
            <li><strong>Correct:</strong> you can change your profile details from your dashboard at any time.</li>
            <li><strong>Delete:</strong> you can delete your account from your dashboard. This removes your account and your registrations straight away. For organizers it also removes your events.</li>
            <li><strong>Leave things out:</strong> interests, age range and experience level are optional.</li>
          </ul>
        </section>

        <section>
          <h2>6. How long we keep it</h2>
          <p>We keep your information while your account exists. When you delete your account, it is removed from our database.</p>
        </section>

        <section>
          <h2>7. Contact</h2>
          <p>
            Questions about your data, or want a copy of it? Contact the Gada Events team
            {CONTACT_EMAIL ? (
              <> at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
            ) : '.'}
          </p>
        </section>
      </article>

      <footer className="privacy-footer">
        <span>© 2026 Gada Events</span>
        <Link to="/">Back to home</Link>
      </footer>
    </main>
  )
}

export default Privacy
