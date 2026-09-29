/**
 * Read duration (seconds) from an audio URL via metadata only.
 * Returns 0 if the media cannot be probed.
 */
export function readAudioDuration(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(0)
      return
    }

    const audio = new Audio()
    audio.preload = 'metadata'

    const finish = (value) => {
      audio.onloadedmetadata = null
      audio.onerror = null
      audio.removeAttribute('src')
      audio.load()
      resolve(value)
    }

    audio.onloadedmetadata = () => {
      const duration = audio.duration
      finish(Number.isFinite(duration) && duration > 0 ? duration : 0)
    }
    audio.onerror = () => finish(0)
    audio.src = url
  })
}

/** Map track id → duration (seconds) for tracks that expose a playable `url`. */
export async function mapTrackDurations(tracks) {
  if (!tracks?.length) return new Map()
  const parts = await Promise.all(
    tracks.map(async (track) => [track.id, await readAudioDuration(track.url)]),
  )
  return new Map(parts.filter(([, seconds]) => seconds > 0))
}

/** Sum durations for tracks that expose a playable `url`. */
export async function sumTrackDurations(tracks) {
  if (!tracks?.length) return 0
  const byId = await mapTrackDurations(tracks)
  let total = 0
  for (const seconds of byId.values()) total += seconds
  return total
}
