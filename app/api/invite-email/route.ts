import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Resend } from 'resend'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/invite-email
 * Body: { inviteeEmail: string, projectName: string, projectLink: string }
 * Sends "xxx invited you to join this project" email to inviteeEmail
 *
 * Setup (like login/forgot-password email flows):
 * 1. Sign up at https://resend.com
 * 2. Add RESEND_API_KEY to .env.local (from Resend Dashboard → API Keys)
 * 3. Free tier: onboarding@resend.dev can only send to YOUR Resend account email.
 *    Add and verify your domain in Resend to send to any address.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[invite-email] RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured. Add RESEND_API_KEY to .env.local (get key from resend.com)' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const inviteeEmail = typeof body.inviteeEmail === 'string' ? body.inviteeEmail.trim() : ''
    const projectName = typeof body.projectName === 'string' ? body.projectName.trim() : ''
    const projectLink = typeof body.projectLink === 'string' ? body.projectLink.trim() : ''

    if (!inviteeEmail || !EMAIL_REGEX.test(inviteeEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (!projectName) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }
    if (!projectLink || !projectLink.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid project link' }, { status: 400 })
    }

    const inviterName = session.user.name || session.user.email?.split('@')[0] || 'Someone'

    const fromDomain = process.env.RESEND_FROM_DOMAIN || 'onboarding@resend.dev'
    const fromName = process.env.RESEND_FROM_NAME || 'Nexus'

    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromDomain}>`,
      to: inviteeEmail,
      subject: `${inviterName} invited you to join: ${projectName}`,
      html: `
        <p>Hi,</p>
        <p><strong>${inviterName}</strong> invited you to join this project:</p>
        <p><strong>${projectName}</strong></p>
        <p><a href="${projectLink}" style="display:inline-block;padding:10px 20px;background:#0d9488;color:white;text-decoration:none;border-radius:6px;">View Project</a></p>
        <p>Or copy this link: <a href="${projectLink}">${projectLink}</a></p>
        <p>— Nexus</p>
      `,
    })

    if (error) {
      console.error('[invite-email] Resend error:', error)
      // Resend returns { message, name } - surface the actual error to user
      const msg = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: string }).message)
        : String(error)
      return NextResponse.json({
        error: msg || 'Failed to send email',
        hint: msg.includes('domain') || msg.includes('from')
          ? 'Verify your domain in Resend, or use onboarding@resend.dev only to send to your Resend account email.'
          : undefined,
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (e) {
    console.error('[invite-email]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      error: msg || 'Failed to send invite',
      hint: msg.includes('fetch') || msg.includes('network') ? 'Check network or Resend API status.' : undefined,
    }, { status: 500 })
  }
}
