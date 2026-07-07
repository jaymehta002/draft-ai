const QUEUE_KEY = "offlineQueue"
const MAX_QUEUE_SIZE = 10

export type OfflineQueueItem = {
  type: "send-email" | "record-outreach" | "mark-copied"
  payload: unknown
  createdAt: number
}

export async function enqueueOfflineAction(item: Omit<OfflineQueueItem, "createdAt">) {
  const result = await chrome.storage.local.get(QUEUE_KEY)
  const queue: OfflineQueueItem[] = Array.isArray(result[QUEUE_KEY]) ? result[QUEUE_KEY] : []

  const entry: OfflineQueueItem = { ...item, createdAt: Date.now() }
  const next = [...queue, entry].slice(-MAX_QUEUE_SIZE)

  await chrome.storage.local.set({ [QUEUE_KEY]: next })
  await updateQueueBadge(next.length)

  return next.length
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY)
  return Array.isArray(result[QUEUE_KEY]) ? result[QUEUE_KEY] : []
}

export async function clearOfflineQueue() {
  await chrome.storage.local.set({ [QUEUE_KEY]: [] })
  await updateQueueBadge(0)
}

export async function shiftOfflineQueue(): Promise<OfflineQueueItem | null> {
  const queue = await getOfflineQueue()
  if (queue.length === 0) return null

  const [first, ...rest] = queue
  await chrome.storage.local.set({ [QUEUE_KEY]: rest })
  await updateQueueBadge(rest.length)
  return first
}

async function updateQueueBadge(count: number) {
  if (typeof chrome === "undefined" || !chrome.action?.setBadgeText) return
  if (count > 0) {
    await chrome.action.setBadgeText({ text: "!" })
    await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" })
  } else {
    await chrome.action.setBadgeText({ text: "" })
  }
}

export function isRetryableFetchError(error: unknown, response?: Response) {
  if (response && response.status >= 500) return true
  if (error instanceof TypeError) return true
  return false
}
