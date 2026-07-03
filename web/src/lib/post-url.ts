export function postUrlFromId(postId: string): string | null {
  if (postId.startsWith("x:")) {
    return `https://x.com/i/status/${postId.slice(2)}`
  }

  if (postId.startsWith("linkedin:")) {
    const id = postId.slice("linkedin:".length)
    if (id.startsWith("urn:")) {
      return `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}/`
    }
    return `https://www.linkedin.com/feed/update/${id}/`
  }

  return null
}

export function resolvePostUrl(postUrl: string | null | undefined, postId: string): string | null {
  return postUrl || postUrlFromId(postId)
}
