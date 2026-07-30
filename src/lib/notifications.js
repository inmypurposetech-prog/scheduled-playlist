const CHANNEL = 'practice-day-reminder'

export function notificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function ensureNotificationPermission() {
  if (!notificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function showReadyPromptNotification({ title, body, tag = 'practice-ready' }) {
  if (!notificationSupported() || Notification.permission !== 'granted') {
    return null
  }

  const notification = new Notification(title, {
    body,
    tag,
    requireInteraction: true,
    icon: '/favicon.svg',
  })

  notification.onclick = () => {
    window.focus()
    window.dispatchEvent(new CustomEvent('practice-day:open-ready'))
    notification.close()
  }

  return notification
}

/** Schedule local reminders while the app (or a kept-alive tab) is open. */
export function startReminderWatcher({ getSettings, onFire }) {
  let lastFiredKey = null

  const tick = () => {
    const settings = getSettings()
    if (!settings?.enabled || !settings?.time) return

    const now = new Date()
    const [h, m] = settings.time.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return

    const withinMinute =
      now.getHours() === h && now.getMinutes() === m

    const key = `${now.toDateString()}-${settings.time}`
    if (withinMinute && lastFiredKey !== key) {
      lastFiredKey = key
      onFire(settings)
      try {
        localStorage.setItem(`${CHANNEL}:last`, key)
      } catch {
        /* ignore */
      }
    }
  }

  try {
    lastFiredKey = localStorage.getItem(`${CHANNEL}:last`)
  } catch {
    lastFiredKey = null
  }

  tick()
  const id = window.setInterval(tick, 15_000)
  return () => window.clearInterval(id)
}
