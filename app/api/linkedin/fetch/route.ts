import { NextRequest, NextResponse } from 'next/server'
import {
  displayNameGuessFromLinkedInUsername,
  isLinkedInProfileUrlFormat,
  parseLinkedInProfileUrl,
} from '@/lib/linkedinUrl'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawUrl = body?.linkedinUrl

    if (!rawUrl || typeof rawUrl !== 'string') {
      return NextResponse.json({ error: 'LinkedIn URL is required' }, { status: 400 })
    }

    if (!isLinkedInProfileUrlFormat(rawUrl)) {
      return NextResponse.json(
        { error: 'Invalid LinkedIn URL format. Please use: https://www.linkedin.com/in/your-profile' },
        { status: 400 }
      )
    }

    const parsed = parseLinkedInProfileUrl(rawUrl)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Could not extract LinkedIn profile id from URL' },
        { status: 400 }
      )
    }

    const { username, canonical: canonicalLinkedInUrl } = parsed

    /**
     * We do not scrape LinkedIn HTML: many views require login, bots are blocked, and scraping
     * conflicts with LinkedIn’s terms. Real profile data requires LinkedIn’s official APIs.
     * Response below is structured placeholder data so Nexus onboarding still works.
     */

    type MockShape = {
      name: string
      headline: string
      location: string
      company: string
      education: string
      bio: string
      skills: string[]
      photoUrl: string
    }

    const mockProfiles: Record<string, MockShape> = {
      default: {
        name: 'Demo User',
        headline: 'Product Manager at Tech Company',
        location: 'San Francisco, CA',
        company: 'Tech Corp',
        education: 'Stanford University',
        bio: 'Passionate about building products that make a difference.',
        skills: ['Product Management', 'Strategy', 'Data Analysis', 'User Research', 'Agile'],
        photoUrl: '',
      },
    }

    const guessedName = displayNameGuessFromLinkedInUsername(username)
    const baseDefault = mockProfiles.default
    const profile: MockShape =
      mockProfiles[username.toLowerCase()] ?? {
        ...baseDefault,
        name: guessedName,
        headline: `${guessedName} — preview (not from LinkedIn servers)`,
        bio: 'Nexus cannot read your real LinkedIn profile without LinkedIn’s official API. You can edit everything on your Nexus profile after sign-up.',
        company: '',
        education: '',
        location: '',
        skills: [],
        photoUrl: '',
      }

    const titleFromHeadline = profile.headline.includes(' at ')
      ? profile.headline.split(' at ')[0]!.trim()
      : profile.headline.trim()

    const experiences = [
      {
        id: `linkedin-exp-${username}`,
        title: titleFromHeadline || profile.headline,
        company: profile.company,
        location: profile.location,
        current: true,
        description: profile.bio || undefined,
      },
    ]

    const educationItems = profile.education.trim()
      ? [
          {
            id: `linkedin-edu-${username}`,
            school: profile.education,
          },
        ]
      : []

    return NextResponse.json({
      name: profile.name,
      headline: profile.headline,
      location: profile.location,
      company: profile.company,
      education: profile.education,
      bio: profile.bio,
      skills: profile.skills,
      photoUrl: profile.photoUrl,
      linkedinUrl: canonicalLinkedInUrl,
      username,
      experiences,
      educationItems,
      importSource: 'placeholder',
      _note:
        'Profile fields are placeholders until LinkedIn API access is configured. The public URL is normalized for reliable opening in the browser.',
    })
  } catch (error) {
    console.error('LinkedIn fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LinkedIn profile. Please try again.' },
      { status: 500 }
    )
  }
}
