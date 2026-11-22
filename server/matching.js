// Audience targeting and recommendation rules for Gada Events.
// Kept separate from server.js so they can be unit tested on their own.

// Allowed audience/interest tags, reused for both an event's target
// audience and a participant's own interests so they can be matched.
const AUDIENCE_TAGS = [
  'Students',
  'Entrepreneurs',
  'Tech Professionals',
  'Government & NGO',
  'General Public',
  'Women',
  'Youth (18-25)',
  'Business Leaders',
  'Artists & Creatives',
  'Researchers & Academics',
]

function validateAudienceTags(tags) {
  if (tags === undefined) return { value: [] }
  if (!Array.isArray(tags)) return { error: 'Target audience must be a list of tags.' }
  if (tags.length > 8) return { error: 'Choose at most 8 target audience tags.' }

  const invalid = tags.filter((tag) => !AUDIENCE_TAGS.includes(tag))
  if (invalid.length > 0) {
    return { error: `Unrecognized audience tag: ${invalid[0]}` }
  }

  return { value: [...new Set(tags)] }
}

const AGE_RANGES = ['18-25', '26-35', '36-45', '46+']
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Professional']

// Organizer's short "who is this for?" answers (age ranges + experience level)
function validateTargeting(body = {}) {
  const ageRanges = body.target_age_ranges === undefined ? [] : body.target_age_ranges

  if (!Array.isArray(ageRanges) || ageRanges.some((age) => !AGE_RANGES.includes(age))) {
    return { error: 'Choose valid target age ranges.' }
  }

  const experience =
    body.target_experience === undefined || body.target_experience === ''
      ? 'All levels'
      : body.target_experience

  if (!['All levels', ...EXPERIENCE_LEVELS].includes(experience)) {
    return { error: 'Choose a valid target experience level.' }
  }

  return { age_ranges: [...new Set(ageRanges)], experience }
}

function hasTargeting(event) {
  return (
    (event.target_audience || []).length > 0 ||
    (event.target_age_ranges || []).length > 0 ||
    (event.target_experience && event.target_experience !== 'All levels')
  )
}

// Match score between an event's target and a participant's profile (0-100):
//   interests 50 pts, age range 25 pts, experience level 25 pts.
// A part the organizer left open ("everyone") counts as a full match.
function computeMatchScore(event, profile = {}) {
  const eventTags = event.target_audience || []
  const eventAges = event.target_age_ranges || []
  const eventLevel = event.target_experience || 'All levels'
  const interests = profile.interests || []

  let score = 0

  if (eventTags.length === 0) {
    score += 50
  } else {
    const overlap = eventTags.filter((tag) => interests.includes(tag)).length
    const needed = Math.min(2, eventTags.length)
    score += overlap >= needed ? 50 : overlap >= 1 ? 35 : 0
  }

  if (eventAges.length === 0 || (profile.age_range && eventAges.includes(profile.age_range))) {
    score += 25
  }

  if (eventLevel === 'All levels' || profile.experience_level === eventLevel) {
    score += 25
  }

  return score
}

module.exports = {
  AUDIENCE_TAGS,
  AGE_RANGES,
  EXPERIENCE_LEVELS,
  validateAudienceTags,
  validateTargeting,
  hasTargeting,
  computeMatchScore,
}
