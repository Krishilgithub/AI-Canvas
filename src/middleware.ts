import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. Update session (handles refreshing auth tokens)
  const response = await updateSession(request)

  // 2. Add Onboarding Redirect Logic
  // Check if user is authenticated
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response.headers.set('x-middleware-request-cookie', request.cookies.toString())
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Ignore auth callbacks, API routes, and static assets
  if (path.startsWith('/auth') || path.startsWith('/api') || path.includes('.')) {
    return response
  }

  // If user is logged in
  if (user) {
    const onboardingComplete = user.user_metadata?.onboarding_completed === true

    // If they haven't completed onboarding, and they aren't already on the onboarding page, force them there
    if (!onboardingComplete && path !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // If they HAVE completed onboarding, don't let them go back to the onboarding page
    if (onboardingComplete && path === '/onboarding') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
