/**
 * Shared data-loading hook for the panel's endpoints.
 *
 * Two behaviours a plain `fetch` in an effect does not give you, both of which
 * the panel needs:
 *
 *   1. A perceptible minimum busy time. A warm request resolves in ~20ms, so
 *      the spinner would flash for a single frame and read as "nothing
 *      happened". The request is already finished when the floor elapses, so
 *      the wait costs the user nothing.
 *
 *   2. A cache that outlives the component. The panel unmounts when it closes,
 *      so without a cache every reopen replays the loading state and the panel
 *      grows into its final height. With one, later opens paint real content
 *      immediately and refresh behind it.
 *
 * @module dsh-scope/useRemote
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** Floor for the busy state, in milliseconds. */
export const MIN_BUSY_MS = 450

/**
 * @param path - same-origin endpoint answering `{ ok: true, ... }` JSON.
 * @param cache - mutable box (`{ value }`) owned by the caller, one per endpoint.
 * @returns the latest payload, loading and error state, and a stable refresh.
 */
export function useRemote(path, cache) {
  const [data, setData] = useState(cache.value)
  const [loading, setLoading] = useState(cache.value === null)
  const [error, setError] = useState(null)
  // Guards against a slow earlier response overwriting a newer one.
  const requestRef = useRef(0)

  const load = useCallback(() => {
    const request = ++requestRef.current
    const startedAt = Date.now()
    setLoading(true)
    setError(null)

    // Hold the busy state to the floor before applying the outcome.
    const settle = (apply) => {
      const remaining = Math.max(0, MIN_BUSY_MS - (Date.now() - startedAt))
      setTimeout(() => {
        if (request !== requestRef.current) return
        apply()
        setLoading(false)
      }, remaining)
    }

    fetch(path, { headers: { accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        if (payload?.ok === false) throw new Error(payload.message ?? payload.error ?? 'request failed')
        settle(() => {
          cache.value = payload
          setData(payload)
        })
      })
      .catch((reason) => {
        settle(() => setError(String(reason?.message ?? reason)))
      })
  }, [path, cache])

  useEffect(() => { load() }, [load])
  return { data, loading, error, load }
}
