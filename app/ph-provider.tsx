'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from '@posthog/react'

export default function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}


