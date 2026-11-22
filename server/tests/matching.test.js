const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  computeMatchScore,
  validateAudienceTags,
  validateTargeting,
  hasTargeting,
} = require('../matching')

const pitchWorkshop = {
  target_audience: ['Entrepreneurs', 'Students'],
  target_age_ranges: ['18-25', '26-35'],
  target_experience: 'Beginner',
}

test('perfect match scores 100', () => {
  const profile = { interests: ['Entrepreneurs', 'Students'], age_range: '18-25', experience_level: 'Beginner' }
  assert.equal(computeMatchScore(pitchWorkshop, profile), 100)
})

test('one shared interest gives 35 interest points', () => {
  const profile = { interests: ['Students'], age_range: '18-25', experience_level: 'Beginner' }
  assert.equal(computeMatchScore(pitchWorkshop, profile), 85)
})

test('no shared interest, wrong age and level scores 0', () => {
  const profile = { interests: ['Artists & Creatives'], age_range: '46+', experience_level: 'Professional' }
  assert.equal(computeMatchScore(pitchWorkshop, profile), 0)
})

test('event open to everyone scores 100 for any profile', () => {
  assert.equal(computeMatchScore({}, { interests: ['Women'], age_range: '46+' }), 100)
})

test('empty profile still gets points where the event is open', () => {
  const event = { target_audience: ['Students'], target_age_ranges: [], target_experience: 'All levels' }
  assert.equal(computeMatchScore(event, {}), 50)
})

test('event with a single tag needs only that tag for full interest points', () => {
  const event = { target_audience: ['Women'] }
  assert.equal(computeMatchScore(event, { interests: ['Women'] }), 100)
})

test('score always stays between 0 and 100', () => {
  const profiles = [{}, { interests: ['Students'] }, { age_range: '26-35', experience_level: 'Beginner' }]
  for (const p of profiles) {
    const s = computeMatchScore(pitchWorkshop, p)
    assert.ok(s >= 0 && s <= 100)
  }
})

test('audience tags: valid list is accepted and duplicates removed', () => {
  assert.deepEqual(validateAudienceTags(['Students', 'Students', 'Women']), { value: ['Students', 'Women'] })
})

test('audience tags: unknown tag is rejected', () => {
  assert.ok(validateAudienceTags(['Aliens']).error)
})

test('audience tags: more than 8 tags is rejected', () => {
  assert.ok(validateAudienceTags(new Array(9).fill('Students')).error)
})

test('targeting: invalid age range is rejected', () => {
  assert.ok(validateTargeting({ target_age_ranges: ['10-15'] }).error)
})

test('targeting: missing experience defaults to All levels', () => {
  assert.deepEqual(validateTargeting({}), { age_ranges: [], experience: 'All levels' })
})

test('hasTargeting is false for an open event and true once a tag is set', () => {
  assert.ok(!hasTargeting({}))
  assert.ok(hasTargeting({ target_audience: ['Students'] }))
})
