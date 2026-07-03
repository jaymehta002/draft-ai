export const SENT_POSTS_STORAGE_KEY = "sentPostIds"

export type SentPostRecord = {
  postId: string
  status: "SENT" | "COPIED"
  sentAt: number
}

export type SentPostsMap = Record<string, SentPostRecord>

export async function getSentPosts(): Promise<SentPostsMap> {
  const result = await chrome.storage.local.get(SENT_POSTS_STORAGE_KEY)
  return (result[SENT_POSTS_STORAGE_KEY] as SentPostsMap) || {}
}

export async function isPostSent(postId: string): Promise<boolean> {
  const map = await getSentPosts()
  return !!map[postId]
}

export async function markPostSent(postId: string, status: "SENT" | "COPIED" = "SENT") {
  const map = await getSentPosts()
  map[postId] = { postId, status, sentAt: Date.now() }
  await chrome.storage.local.set({ [SENT_POSTS_STORAGE_KEY]: map })
}

export async function mergeSentPosts(records: SentPostRecord[]) {
  const map = await getSentPosts()
  for (const record of records) {
    if (!map[record.postId] || record.sentAt > map[record.postId].sentAt) {
      map[record.postId] = record
    }
  }
  await chrome.storage.local.set({ [SENT_POSTS_STORAGE_KEY]: map })
}
