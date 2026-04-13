import { NextRequest, NextResponse } from 'next/server'

// Mock data for demo - in production, use a proper LinkedIn API
const MOCK_PROFILES: Record<string, {
  name: string
  headline: string
  location: string
  company: string
  education: string
  skills: string[]
  photoUrl: string
}> = {
  'john-doe': {
    name: 'John Doe',
    headline: 'Product Manager at Tech Corp',
    location: 'San Francisco, CA',
    company: 'Tech Corp',
    education: 'Stanford University',
    skills: ['Product Management', 'Strategy', 'Data Analysis', 'User Research', 'Agile'],
    photoUrl: ''
  },
  'jane-smith': {
    name: 'Jane Smith',
    headline: 'Senior Software Engineer',
    location: 'New York, NY',
    company: 'Google',
    education: 'MIT',
    skills: ['Python', 'Machine Learning', 'System Design', 'Leadership', 'Go'],
    photoUrl: ''
  },
  'alex-chen': {
    name: 'Alex Chen',
    headline: 'Film Director & Cinematographer',
    location: 'Los Angeles, CA',
    company: 'Freelance',
    education: 'UCLA School of Theater, Film and Television',
    skills: ['Cinematography', 'Directing', 'Editing', 'Color Grading', 'Documentary'],
    photoUrl: ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Clean the username
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '')

    if (!cleanUsername) {
      return NextResponse.json(
        { error: 'Invalid username format' },
        { status: 400 }
      )
    }

    // Check if we have a mock profile for this username
    if (MOCK_PROFILES[cleanUsername]) {
      return NextResponse.json({
        found: true,
        username: cleanUsername,
        profile: MOCK_PROFILES[cleanUsername]
      })
    }

    // For demo: any username that doesn't match our mock data returns "not found"
    // This simulates the case where we couldn't find the person
    return NextResponse.json({
      found: false,
      username: cleanUsername,
      error: 'Profile not found. You can enter the LinkedIn URL manually.'
    })

  } catch (error) {
    console.error('LinkedIn search error:', error)
    return NextResponse.json(
      { error: 'Search failed. Please try again.' },
      { status: 500 }
    )
  }
}
