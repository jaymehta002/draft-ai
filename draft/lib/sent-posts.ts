export const SENT_POSTS_STORAGE_KEY = "sentPostIds"

export type SentPostRecord = {
  postId: string
  status: "SENT" | "COPIED"
  sentAt: number
}

export type SentPostsMap = Record<string, SentPostRecord>

let sentPostsLock = Promise.resolve()

function withSentPostsLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = sentPostsLock.then(fn, fn)
  sentPostsLock = next.catch(() => {})
  return next
}

export async function getSentPosts(): Promise<SentPostsMap> {
  const result = await chrome.storage.local.get(SENT_POSTS_STORAGE_KEY)
  return (result[SENT_POSTS_STORAGE_KEY] as SentPostsMap) || {}
}

export async function isPostSent(postId: string): Promise<boolean> {
  const map = await getSentPosts()
  return !!map[postId]
}

export async function updateSentPosts(
  updater: (map: SentPostsMap) => SentPostsMap | void
): Promise<void> {
  return withSentPostsLock(async () => {
    const map = await getSentPosts()
    const result = updater(map)
    await chrome.storage.local.set({ [SENT_POSTS_STORAGE_KEY]: result ?? map })
  })
}

export async function markPostSent(postId: string, status: "SENT" | "COPIED" = "SENT") {
  return updateSentPosts((map) => {
    map[postId] = { postId, status, sentAt: Date.now() }
  })
}

export async function mergeSentPosts(records: SentPostRecord[]) {
  return updateSentPosts((map) => {
    for (const record of records) {
      if (!map[record.postId] || record.sentAt > map[record.postId].sentAt) {
        map[record.postId] = record
      }
    }
  })
}
