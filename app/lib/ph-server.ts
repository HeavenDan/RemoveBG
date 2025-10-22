import { PostHog } from 'posthog-node'

const g: any = globalThis as any

export const ph: PostHog | null = (() => {
  if (process.env.NODE_ENV !== 'production') return null
  const key = process.env.POSTHOG_SECRET_KEY
  if (!key) return null
  if (g.__PH__) return g.__PH__
  const client = new PostHog(key, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST })
  g.__PH__ = client
  return client
})()

export function phCapture(distinctId: string, event: string, properties?: Record<string, any>) {
  if (!ph) return
  ph.capture({ distinctId, event, properties })
}


