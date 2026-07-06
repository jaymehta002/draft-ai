import type { PlasmoCSConfig } from "plasmo"
import { AUTH_STORAGE_KEYS } from "~lib/config"
import { DRAFT_STORAGE_KEY, type DraftPreview } from "~lib/draft"
import { persistDraftEdits } from "~lib/draft-sync"
import {
  dedupeInnermostPosts,
  injectStylesIntoShadowRoots,
  queryAllDeep,
} from "~lib/dom-query"
import {
  getLocalStorage,
  isExtensionContextValid,
  onLocalStorageChanged,
  sendRuntimeMessage,
  setLocalStorage,
  showContextInvalidBanner,
} from "~lib/extension-context"
import {
  SENT_POSTS_STORAGE_KEY,
  getSentPosts,
  isPostSent,
  type SentPostsMap,
} from "~lib/sent-posts"
import { getFeedPlatformFromHostname } from "~lib/platform"
import { extractEmailFromText, inferRecipientNameFromEmail } from "~lib/email"

export const config: PlasmoCSConfig = {
  matches: ["*://*.x.com/*", "*://*.twitter.com/*", "*://*.linkedin.com/*"],
  run_at: "document_idle",
  all_frames: false,
}

const DRAFT_BTN_INLINE_STYLE = [
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  "display:inline-flex",
  "align-items:center",
  "gap:5px",
  "background:#171717",
  "color:#fff",
  "font-size:12px",
  "font-weight:500",
  "padding:5px 12px",
  "border-radius:6px",
  "border:none",
  "cursor:pointer",
  "margin-left:8px",
  "flex-shrink:0",
  "line-height:1.2",
].join(";")

const POPOVER_STYLES = `
  .rp-draft-btn {
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #171717;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    padding: 5px 12px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    margin-left: 8px;
    transition: background 0.15s, opacity 0.15s;
  }
  .rp-draft-btn:hover:not(:disabled) { background: #262626; }
  .rp-draft-btn:disabled { opacity: 0.6; cursor: wait; }
  .rp-draft-btn--ready { background: #1447e6; }
  .rp-draft-btn--ready:hover:not(:disabled) { background: #1038b8; }
  .rp-draft-btn--sent { background: #16a34a; }
  .rp-draft-btn--sent:hover:not(:disabled) { background: #15803d; }
  .rp-draft-btn-wrap {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    flex-shrink: 0;
  }

  .rp-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: auto;
    isolation: isolate;
  }
  .rp-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    pointer-events: auto;
  }
  .rp-popover {
    position: fixed;
    z-index: 2;
    width: 360px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #fff;
    border-radius: 10px;
    border: 1px solid #e5e5e5;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    pointer-events: auto;
  }
  .rp-popover__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid #f0f0f0;
    background: #fff;
  }
  .rp-popover__title {
    font-size: 13px;
    font-weight: 600;
    color: #171717;
  }
  .rp-popover__badge {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 4px;
  }
  .rp-popover__badge--email { background: #eff6ff; color: #1d4ed8; }
  .rp-popover__badge--dm { background: #f5f5f5; color: #525252; }
  .rp-popover__body { padding: 12px 14px; }
  .rp-popover__label {
    font-size: 11px;
    font-weight: 500;
    color: #737373;
    margin-bottom: 5px;
    display: block;
  }
  .rp-popover__input,
  .rp-popover__textarea {
    width: 100%;
    font-size: 13px;
    line-height: 1.5;
    color: #171717;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 8px 10px;
    font-family: inherit;
    box-sizing: border-box;
  }
  .rp-popover__input:focus,
  .rp-popover__textarea:focus {
    outline: none;
    border-color: #171717;
    box-shadow: 0 0 0 1px #171717;
  }
  .rp-popover__textarea {
    min-height: 140px;
    max-height: 220px;
    resize: vertical;
    white-space: pre-wrap;
  }
  .rp-popover__field { margin-bottom: 12px; }
  .rp-popover__field:last-child { margin-bottom: 0; }
  .rp-popover__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 28px 16px;
    color: #737373;
    font-size: 13px;
  }
  .rp-popover__spinner {
    width: 22px;
    height: 22px;
    border: 2px solid #e5e5e5;
    border-top-color: #171717;
    border-radius: 50%;
    animation: rp-spin 0.7s linear infinite;
  }
  @keyframes rp-spin { to { transform: rotate(360deg); } }
  .rp-popover__footer {
    padding: 10px 14px 14px;
    display: flex;
    gap: 8px;
    border-top: 1px solid #f0f0f0;
  }
  .rp-popover__btn {
    flex: 1;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
  }
  .rp-popover__btn--primary {
    background: #2563eb;
    color: #fff;
  }
  .rp-popover__btn--primary:hover:not(:disabled) { background: #1d4ed8; }
  .rp-popover__btn--primary:disabled { opacity: 0.5; cursor: wait; }
  .rp-popover__btn--secondary {
    background: #f5f5f5;
    color: #525252;
    border: 1px solid #e5e5e5;
  }
  .rp-popover__btn--secondary:hover { background: #ebebeb; }
  .rp-popover__close {
    background: none;
    border: none;
    color: #a3a3a3;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0 0 0 8px;
  }
  .rp-popover__close:hover { color: #525252; }
  .rp-popover__error {
    padding: 16px;
    color: #dc2626;
    font-size: 13px;
    text-align: center;
  }
  .rp-popover__hint {
    font-size: 11px;
    color: #a3a3a3;
    text-align: center;
    padding: 0 14px 12px;
  }
`

type PlatformConfig = {
  id: "X" | "LINKEDIN"
  postSelector: string
  findPosts?: () => HTMLElement[]
  actionBarSelector: string
  findActionBar?: (post: HTMLElement) => Element | null
  getAuthorName: (post: HTMLElement) => string
  getPostText: (post: HTMLElement) => string
  getPostId: (post: HTMLElement) => string | null
  getPostUrl?: (post: HTMLElement) => string | null
  getAuthorProfileUrl?: (post: HTMLElement) => string | null
  getAuthorHandle?: (post: HTMLElement) => string | null
}

const LINKEDIN_POST_SELECTORS = [
  '[data-view-name="feed-full-update"]',
  "div.feed-shared-update-v2",
  'div[data-id^="urn:li:activity"]',
  'div[data-urn^="urn:li:activity"]',
  'div[data-urn^="urn:li:aggregatedShare"]',
].join(", ")

const looksLikeLinkedInPost = (container: HTMLElement) => {
  if (container.hasAttribute("data-urn") || container.hasAttribute("data-id")) return true
  if (container.querySelector("[data-urn], [data-id^='urn:li:activity']")) return true
  if (container.querySelector('a[href*="/feed/update/"], a[href*="/posts/"]')) return true
  if (container.querySelector('[data-testid="expandable-text-box"], [data-view-name="feed-commentary"]')) {
    return true
  }
  if (container.querySelector("[class*='social-action'], [class*='feed-shared'], [class*='social-details']")) {
    return true
  }
  const buttons = container.querySelectorAll("button")
  return buttons.length >= 3 && Boolean(container.querySelector("[role='group']"))
}

const findLinkedInPosts = () => {
  const seen = new Set<HTMLElement>()
  const posts: HTMLElement[] = []

  const addCandidate = (node: Element) => {
    const post = node as HTMLElement
    if (seen.has(post) || !looksLikeLinkedInPost(post)) return
    seen.add(post)
    posts.push(post)
  }

  for (const selector of LINKEDIN_POST_SELECTORS.split(",").map((s) => s.trim())) {
    queryAllDeep(selector).forEach(addCandidate)
  }

  queryAllDeep('[data-testid="mainFeed"] div[role="listitem"]').forEach(addCandidate)
  queryAllDeep('main div[role="listitem"]').forEach(addCandidate)

  return dedupeInnermostPosts(posts)
}

const findLinkedInSocialRow = (post: HTMLElement) => {
  const socialLabels = ["like", "comment", "repost", "react", "send", "share"]
  const socialButtons = Array.from(post.querySelectorAll("button[aria-label]")).filter((btn) => {
    const label = btn.getAttribute("aria-label")?.toLowerCase() || ""
    return socialLabels.some((word) => label.includes(word))
  })

  if (socialButtons.length >= 2) {
    let container: Element | null = socialButtons[0].parentElement
    while (container && container !== post) {
      if (socialButtons.every((btn) => container!.contains(btn))) {
        return container
      }
      container = container.parentElement
    }
    return socialButtons[0].parentElement
  }

  return null
}

const findLinkedInActionBar = (post: HTMLElement) => {
  const selectorCandidates = [
    ".feed-shared-social-action-bar",
    '[class*="social-actions-bar"]',
    '[class*="social-actions"]',
    '[class*="social-action-bar"]',
    '[class*="social-details"]',
  ]

  for (const selector of selectorCandidates) {
    const el = post.querySelector(selector)
    if (el) return el
  }

  const socialRow = findLinkedInSocialRow(post)
  if (socialRow) return socialRow

  for (const group of post.querySelectorAll('[role="group"]')) {
    if (group.querySelectorAll("button").length >= 2) return group
  }

  const footer = post.querySelector("footer, [class*='social']")
  return footer
}

const getLinkedInUrn = (post: HTMLElement) => {
  const fromAttr = post.getAttribute("data-urn") || post.getAttribute("data-id")
  if (fromAttr) return fromAttr

  const nested = post.querySelector("[data-urn], [data-id]") as HTMLElement | null
  return nested?.getAttribute("data-urn") || nested?.getAttribute("data-id") || null
}

const PLATFORMS: Record<"X" | "LINKEDIN", PlatformConfig> = {
  X: {
    id: "X" as const,
    postSelector: "article",
    actionBarSelector: "[role='group']",
    getAuthorName: (post: HTMLElement) => {
      const nameElement = post.querySelector("div[dir='ltr'] span span")
      return nameElement?.textContent || ""
    },
    getPostText: (post: HTMLElement) => {
      const textElement = post.querySelector("div[data-testid='tweetText']")
      return textElement?.textContent || ""
    },
    getPostId: (post: HTMLElement) => {
      const link = post.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null
      if (link?.href) {
        const match = link.href.match(/status\/(\d+)/)
        if (match) return `x:${match[1]}`
      }
      const time = post.querySelector("time")?.parentElement as HTMLAnchorElement | null
      if (time?.href) {
        const match = time.href.match(/status\/(\d+)/)
        if (match) return `x:${match[1]}`
      }
      return null
    },
    getPostUrl: (post: HTMLElement) => {
      const link = post.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null
      if (link?.href) return link.href.split("?")[0]
      const time = post.querySelector("time")?.parentElement as HTMLAnchorElement | null
      if (time?.href) return time.href.split("?")[0]
      return null
    },
    getAuthorProfileUrl: (post: HTMLElement) => {
      const authorLink = post.querySelector('a[href^="/"][role="link"]') as HTMLAnchorElement | null
      if (authorLink?.href && !authorLink.href.includes("/status/")) {
        return `https://x.com${authorLink.getAttribute("href")?.split("?")[0] || ""}`
      }
      return null
    },
    getAuthorHandle: (post: HTMLElement) => {
      const handleEl = post.querySelector('a[href^="/"][role="link"] span') as HTMLElement | null
      return handleEl?.textContent?.replace("@", "") || null
    },
  },
  LINKEDIN: {
    id: "LINKEDIN" as const,
    postSelector: LINKEDIN_POST_SELECTORS,
    findPosts: findLinkedInPosts,
    actionBarSelector: ".feed-shared-social-action-bar",
    findActionBar: findLinkedInActionBar,
    getAuthorName: (post: HTMLElement) => {
      const selectors = [
        ".update-components-actor__name span[dir='ltr']",
        ".update-components-actor__title span",
        'a[href*="/in/"] span[aria-hidden="true"]',
        'a[href*="/in/"]',
      ]
      for (const selector of selectors) {
        const el = post.querySelector(selector)
        const text = el?.textContent?.trim()
        if (text) return text
      }
      return ""
    },
    getPostText: (post: HTMLElement) => {
      const textElement = post.querySelector(
        '[data-testid="expandable-text-box"], [data-view-name="feed-commentary"], .update-components-text, .feed-shared-inline-show-more-text, [class*="feed-shared-text"]'
      )
      return textElement?.textContent?.trim() || ""
    },
    getPostId: (post: HTMLElement) => {
      const urn = getLinkedInUrn(post)
      if (urn) return `linkedin:${urn}`

      const componentKey = post.getAttribute("componentkey")
      if (componentKey) return `linkedin:${componentKey}`

      const activityLink = post.querySelector('a[href*="/feed/update/"]') as HTMLAnchorElement | null
      if (activityLink?.href) {
        const match = activityLink.href.match(/feed\/update\/([^/?]+)/)
        if (match) return `linkedin:${decodeURIComponent(match[1])}`
      }
      return null
    },
    getPostUrl: (post: HTMLElement) => {
      const activityLink = post.querySelector('a[href*="/feed/update/"]') as HTMLAnchorElement | null
      if (activityLink?.href) return activityLink.href.split("?")[0]

      const urn = getLinkedInUrn(post)
      if (urn) return `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/`
      return null
    },
    getAuthorProfileUrl: (post: HTMLElement) => {
      const profileLink = post.querySelector(
        'a[href*="/in/"], .update-components-actor__meta-link, a.app-aware-link.update-components-actor__container-link'
      ) as HTMLAnchorElement | null
      return profileLink?.href?.split("?")[0] || null
    },
    getAuthorHandle: (post: HTMLElement) => {
      const profileLink = post.querySelector('a[href*="/in/"]') as HTMLAnchorElement | null
      const href = profileLink?.getAttribute("href") || ""
      const match = href.match(/\/in\/([^/?]+)/)
      return match ? decodeURIComponent(match[1]) : null
    },
  },
}

let activePopover: HTMLElement | null = null

const injectCSS = () => {
  if (!document.getElementById("recruit-pitch-style")) {
    const style = document.createElement("style")
    style.id = "recruit-pitch-style"
    style.textContent = POPOVER_STYLES
    document.head.appendChild(style)
  }
  injectStylesIntoShadowRoots(POPOVER_STYLES, "recruit-pitch-style-shadow")
}

const getPlatform = () => {
  const id = getFeedPlatformFromHostname(window.location.hostname)
  if (id === "X") return PLATFORMS.X
  if (id === "LINKEDIN") return PLATFORMS.LINKEDIN
  return null
}

async function fallbackPostId(text: string, name: string, platform: string): Promise<string> {
  const input = `${platform}:${name}:${text.slice(0, 500)}`
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", data)
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20)
  return `hash:${platform.toLowerCase()}:${hex}`
}

async function resolvePostId(
  post: HTMLElement,
  platform: PlatformConfig,
  text: string,
  name: string
): Promise<string> {
  return platform.getPostId(post) || (await fallbackPostId(text, name, platform.id))
}

let activeOverlay: HTMLElement | null = null
let sentPostsCache: SentPostsMap = {}
let domObserver: MutationObserver | null = null
let removeStorageListener: (() => void) | null = null
let injectRetryTimers: number[] = []

const CONTEXT_INVALID_MSG = "Extension was updated — refresh this page to continue."

const applySentState = (button: HTMLButtonElement) => {
  button.className = "rp-draft-btn rp-draft-btn--sent"
  button.style.cssText = DRAFT_BTN_INLINE_STYLE + ";background:#16a34a;opacity:1;cursor:default;"
  button.innerHTML = "✓ Sent"
  button.disabled = true
  button.dataset.postSent = "true"
}

const refreshButtonsForSentPosts = () => {
  document.querySelectorAll<HTMLButtonElement>("[data-draft-ai-post-id]").forEach((button) => {
    const postId = button.dataset.draftAiPostId
    if (postId && sentPostsCache[postId]) {
      applySentState(button)
    }
  })
}

const loadSentPosts = async () => {
  if (!isExtensionContextValid()) return

  await sendRuntimeMessage({ type: "SYNC_SENT_POSTS" })
  const map = await getSentPosts()
  sentPostsCache = map
  refreshButtonsForSentPosts()
}

function teardownContentScript() {
  domObserver?.disconnect()
  domObserver = null
  injectRetryTimers.forEach((timer) => window.clearTimeout(timer))
  injectRetryTimers = []
  removeStorageListener?.()
  removeStorageListener = null
}

const getPostsForPlatform = (platform: PlatformConfig) =>
  platform.findPosts?.() ?? Array.from(document.querySelectorAll<HTMLElement>(platform.postSelector))

const getActionBarForPost = (post: HTMLElement, platform: PlatformConfig) =>
  platform.findActionBar?.(post) ?? post.querySelector(platform.actionBarSelector)

const getOrCreateInjectionTarget = (post: HTMLElement, platform: PlatformConfig): Element | null => {
  const actionBar = getActionBarForPost(post, platform)
  if (actionBar) return actionBar

  if (platform.id !== "LINKEDIN") return null

  let fallback = post.querySelector(":scope > .rp-draft-fallback-bar") as HTMLElement | null
  if (!fallback) {
    fallback = document.createElement("div")
    fallback.className = "rp-draft-fallback-bar"
    fallback.style.cssText =
      "display:flex;justify-content:flex-end;align-items:center;padding:6px 16px 10px;gap:8px;"
    post.appendChild(fallback)
  }
  return fallback
}

const appendDraftButton = (actionBar: Element, button: HTMLButtonElement) => {
  const wrap = document.createElement("div")
  wrap.className = "rp-draft-btn-wrap"
  wrap.appendChild(button)
  actionBar.appendChild(wrap)
}

const bindAction = (el: Element | null, handler: () => void | Promise<void>) => {
  if (!el) return

  el.addEventListener("pointerdown", (e) => {
    e.preventDefault()
    e.stopPropagation()
  }, true)

  el.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    await handler()
  }, true)
}

const closePopover = () => {
  activeOverlay?.remove()
  activeOverlay = null
}

const positionPopover = (anchor: HTMLElement, popover: HTMLElement) => {
  const rect = anchor.getBoundingClientRect()
  const popoverWidth = 340
  const margin = 8

  let left = rect.left
  let top = rect.bottom + margin
  popover.style.transform = ""

  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16
  }
  if (left < 16) left = 16

  const estimatedHeight = 400
  if (top + estimatedHeight > window.innerHeight - 16) {
    top = Math.max(16, rect.top - margin - estimatedHeight)
  }

  popover.style.left = `${left}px`
  popover.style.top = `${top}px`
}

const renderPopoverLoading = (popover: HTMLElement, recipientName: string) => {
  popover.innerHTML = `
    <div class="rp-popover__header">
      <span class="rp-popover__title">Drafting outreach</span>
    </div>
    <div class="rp-popover__loading">
      <div class="rp-popover__spinner"></div>
      <span>Writing for ${recipientName || "this post"}...</span>
    </div>
    <p class="rp-popover__hint">Full preview opening in side panel</p>
  `
}

const rpEscapeHtml = (text: string) => {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

const escapeAttr = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")

let popoverPersistTimer: ReturnType<typeof setTimeout> | null = null

const getPopoverDraftValues = (popover: HTMLElement) => ({
  subject: (popover.querySelector('[data-field="subject"]') as HTMLInputElement)?.value ?? "",
  message: (popover.querySelector('[data-field="message"]') as HTMLTextAreaElement)?.value ?? "",
})

const bindPopoverEditing = (popover: HTMLElement) => {
  popover.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("input", () => {
      if (popoverPersistTimer) clearTimeout(popoverPersistTimer)
      popoverPersistTimer = setTimeout(() => {
        const { message, subject } = getPopoverDraftValues(popover)
        persistDraftEdits(message, subject)
      }, 400)
    })
  })
}

const renderPopoverReady = (popover: HTMLElement, draft: DraftPreview) => {
  const isEmail = draft.actionMode === "EMAIL"
  const badgeClass = isEmail ? "rp-popover__badge--email" : "rp-popover__badge--dm"

  popover.innerHTML = `
    <div class="rp-popover__header">
      <span class="rp-popover__title">${rpEscapeHtml(draft.recipientName || "Draft")}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="rp-popover__badge ${badgeClass}">${isEmail ? "Email" : "DM"}</span>
        <button type="button" class="rp-popover__close" aria-label="Close">&times;</button>
      </div>
    </div>
    <div class="rp-popover__body">
      ${isEmail ? `
        <div class="rp-popover__field">
          <label class="rp-popover__label">Subject</label>
          <input type="text" class="rp-popover__input" data-field="subject" value="${escapeAttr(draft.subject ?? "")}" />
        </div>
      ` : ""}
      <div class="rp-popover__field">
        <label class="rp-popover__label">Message</label>
        <textarea class="rp-popover__textarea" data-field="message">${rpEscapeHtml(draft.message)}</textarea>
      </div>
    </div>
    <div class="rp-popover__footer">
      <button type="button" class="rp-popover__btn rp-popover__btn--secondary" data-action="panel">Side panel</button>
      <button type="button" class="rp-popover__btn rp-popover__btn--primary" data-action="primary">
        ${isEmail ? "Send email" : "Copy message"}
      </button>
    </div>
  `

  bindPopoverEditing(popover)
}

const bindReadyPopoverActions = (
  popover: HTMLElement,
  draft: DraftPreview,
  button: HTMLButtonElement
) => {
  const isEmail = draft.actionMode === "EMAIL"

  bindAction(popover.querySelector(".rp-popover__close"), closePopover)

  bindAction(popover.querySelector('[data-action="panel"]'), async () => {
    const { message, subject } = getPopoverDraftValues(popover)
    await persistDraftEdits(message, subject)
    const opened = await sendRuntimeMessage({ type: "OPEN_SIDE_PANEL" })
    if (opened === null) {
      renderPopoverError(popover, CONTEXT_INVALID_MSG)
      return
    }
    closePopover()
  })

  bindAction(popover.querySelector('[data-action="primary"]'), async () => {
    const primaryBtn = popover.querySelector('[data-action="primary"]') as HTMLButtonElement
    const { message, subject } = getPopoverDraftValues(popover)
    await persistDraftEdits(message, subject)

    if (!isEmail) {
      await navigator.clipboard.writeText(message)
      if (draft.postId) {
        const recorded = await sendRuntimeMessage({
          type: "RECORD_OUTREACH",
          payload: {
            postId: draft.postId,
            postUrl: draft.postUrl,
            platform: draft.platform,
            draftId: draft.draftId,
            recipientName: draft.recipientName,
            recipientHandle: draft.recipientHandle,
            recipientProfileUrl: draft.recipientProfileUrl,
            message,
            actionMode: "DM",
          },
        })
        if (recorded === null) {
          renderPopoverError(popover, CONTEXT_INVALID_MSG)
          return
        }
        applySentState(button)
      }
      primaryBtn.textContent = "Copied"
      setTimeout(closePopover, 1200)
      return
    }

    if (!draft.emailPayload) return

    primaryBtn.disabled = true
    primaryBtn.textContent = "Sending…"

    const payload = {
      ...draft.emailPayload,
      body: message,
      subject: subject || draft.emailPayload.subject,
    }

    const sendResponse = await sendRuntimeMessage<{ success: boolean; error?: string }>({
      type: "SEND_EMAIL",
      payload,
    })

    if (sendResponse === null) {
      primaryBtn.disabled = false
      primaryBtn.textContent = "Send email"
      renderPopoverError(popover, CONTEXT_INVALID_MSG)
      return
    }

    if (!sendResponse.success) {
      primaryBtn.disabled = false
      primaryBtn.textContent = "Send email"
      renderPopoverError(popover, sendResponse?.error || "Failed to send")
      return
    }

    applySentState(button)

    popover.innerHTML = `
      <div class="rp-popover__header">
        <span class="rp-popover__title">Sent</span>
        <button type="button" class="rp-popover__close" aria-label="Close">&times;</button>
      </div>
      <div class="rp-popover__body" style="text-align:center;padding:24px 14px">
        <p style="font-size:13px;color:#525252">Your email was sent.</p>
      </div>
    `
    bindAction(popover.querySelector(".rp-popover__close"), closePopover)

    await setLocalStorage({
      [DRAFT_STORAGE_KEY]: { ...draft, status: "sent", message, subject, updatedAt: Date.now() },
    })
  })
}

const showReadyPopover = (anchor: HTMLElement, draft: DraftPreview, button: HTMLButtonElement) => {
  const popover = openPopover(anchor, draft.recipientName, false)
  renderPopoverReady(popover, draft)
  bindReadyPopoverActions(popover, draft, button)
}


const renderPopoverError = (popover: HTMLElement, message: string) => {
  popover.innerHTML = `
    <div class="rp-popover__header">
      <span class="rp-popover__title">Draft failed</span>
      <button type="button" class="rp-popover__close" aria-label="Close">&times;</button>
    </div>
    <div class="rp-popover__error">${rpEscapeHtml(message)}</div>
  `
  bindAction(popover.querySelector(".rp-popover__close"), closePopover)
}

const openPopover = (anchor: HTMLElement, recipientName: string, showLoading = true) => {
  closePopover()

  const overlay = document.createElement("div")
  overlay.className = "rp-overlay"
  overlay.id = "recruit-pitch-overlay"

  const backdrop = document.createElement("div")
  backdrop.className = "rp-backdrop"
  bindAction(backdrop, closePopover)

  const popover = document.createElement("div")
  popover.className = "rp-popover"
  popover.id = "recruit-pitch-popover"

  overlay.appendChild(backdrop)
  overlay.appendChild(popover)
  document.body.appendChild(overlay)
  activeOverlay = overlay

  if (showLoading) {
    renderPopoverLoading(popover, recipientName)
  }
  positionPopover(anchor, popover)

  const onScroll = () => positionPopover(anchor, popover)
  const onResize = () => positionPopover(anchor, popover)
  window.addEventListener("scroll", onScroll, true)
  window.addEventListener("resize", onResize)

  const cleanup = () => {
    window.removeEventListener("scroll", onScroll, true)
    window.removeEventListener("resize", onResize)
  }

  overlay.addEventListener("remove", cleanup)

  return popover
}

const handleDraftClick = async (button: HTMLButtonElement, post: HTMLElement, platform: PlatformConfig) => {
  if (button.disabled || button.dataset.postSent === "true") return

  const text = platform.getPostText(post)
  const name = platform.getAuthorName(post)
  const postId = await resolvePostId(post, platform, text, name)
  const postUrl = platform.getPostUrl?.(post) || null
  const recipientProfileUrl = platform.getAuthorProfileUrl?.(post) || null
  const recipientHandle = platform.getAuthorHandle?.(post) || null

  if (sentPostsCache[postId] || (await isPostSent(postId))) {
    applySentState(button)
    return
  }

  button.disabled = true
  button.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:rp-spin 0.7s linear infinite"></span> Drafting...`

  const email = extractEmailFromText(text)
  const emailRecipientName = email ? inferRecipientNameFromEmail(email) : null

  const popover = openPopover(button, emailRecipientName || name)

  try {
    const payload = {
      text,
      name,
      hasEmail: !!email,
      extractedEmail: email,
      emailRecipientName,
      postId,
      postUrl,
      platform: platform.id,
      recipientHandle,
      recipientProfileUrl,
    }

    const response = await sendRuntimeMessage<{
      success: boolean
      error?: string
      data?: {
        detected_name: string
        is_hiring_relevant: boolean
        match_score: number
        match_reason: string
        fit_highlights: string[]
        action_mode: string
        outreach_payload: { subject_line: string | null; message_content: string }
      }
      draftId?: string
      cached?: boolean
    }>({ type: "DRAFT_PITCH", payload })

    if (response === null) {
      throw new Error(CONTEXT_INVALID_MSG)
    }

    if (!response.success) {
      throw new Error(response.error || "Failed to draft pitch")
    }

    const {
      action_mode,
      outreach_payload,
      detected_name,
      is_hiring_relevant,
      match_score,
      match_reason,
      fit_highlights,
    } = response.data!
    const displayRecipientName = emailRecipientName || name || "Unknown"
    const draft: DraftPreview = {
      status: "ready",
      actionMode: action_mode as "EMAIL" | "DM",
      recipientName: displayRecipientName,
      recipientEmail: email,
      detectedName: detected_name || displayRecipientName,
      recipientHandle: recipientHandle || undefined,
      recipientProfileUrl: recipientProfileUrl || undefined,
      subject: outreach_payload.subject_line,
      message: outreach_payload.message_content,
      sourceText: text,
      matchInsight: {
        score: match_score,
        reason: match_reason,
        highlights: fit_highlights,
        relevant: is_hiring_relevant,
      },
      postId,
      postUrl: postUrl || undefined,
      platform: platform.id,
      draftId: response.draftId,
      cached: response.cached,
      emailPayload:
        action_mode === "EMAIL" && email
          ? {
              to: email,
              subject: outreach_payload.subject_line || "",
              body: outreach_payload.message_content,
              postId,
              postUrl: postUrl || undefined,
              platform: platform.id,
              draftId: response.draftId,
              recipientName: displayRecipientName,
              recipientHandle: recipientHandle || undefined,
              recipientProfileUrl: recipientProfileUrl || undefined,
            }
          : undefined,
      updatedAt: Date.now(),
    }

    const setButtonReady = () => {
      button.className = "rp-draft-btn rp-draft-btn--ready"
      button.innerHTML = "View draft"
      button.disabled = false
      button.dataset.draftReady = "true"
      button.dataset.recipientName = displayRecipientName
    }

    showReadyPopover(button, draft, button)
    setButtonReady()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to draft pitch"
    renderPopoverError(popover, message)
    button.className = "rp-draft-btn"
    button.innerHTML = "Draft"
    button.disabled = false
  }
}

const injectButton = async (post: HTMLElement, platform: PlatformConfig) => {
  if (post.hasAttribute("data-recruit-pitch-injected")) return
  post.setAttribute("data-recruit-pitch-injected", "true")

  const injectionTarget = getOrCreateInjectionTarget(post, platform)
  if (!injectionTarget) {
    post.removeAttribute("data-recruit-pitch-injected")
    return
  }

  const text = platform.getPostText(post)
  const name = platform.getAuthorName(post)
  const postId = await resolvePostId(post, platform, text, name)
  const postUrl = platform.getPostUrl?.(post) || null
  const recipientProfileUrl = platform.getAuthorProfileUrl?.(post) || null
  const recipientHandle = platform.getAuthorHandle?.(post) || null
  post.setAttribute("data-draft-ai-post-id", postId)

  const button = document.createElement("button")
  button.type = "button"
  button.dataset.draftAiPostId = postId
  button.style.cssText = DRAFT_BTN_INLINE_STYLE

  if (sentPostsCache[postId] || (await isPostSent(postId))) {
    applySentState(button)
    appendDraftButton(injectionTarget, button)
    return
  }

  button.className = "rp-draft-btn"
  button.innerHTML = "Draft"

  button.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (button.dataset.postSent === "true") return

    if (button.dataset.draftReady === "true") {
      const stored = await getLocalStorage<Record<string, DraftPreview>>(DRAFT_STORAGE_KEY)
      const draft = stored?.[DRAFT_STORAGE_KEY]
      if (draft?.message) {
        showReadyPopover(button, draft, button)
      }
      return
    }
    handleDraftClick(button, post, platform)
  })

  appendDraftButton(injectionTarget, button)
}

const runInjection = async (platform: PlatformConfig) => {
  if (!isExtensionContextValid()) return

  const auth = await getLocalStorage<Record<string, string | boolean | undefined>>([
    AUTH_STORAGE_KEYS.enabled,
    AUTH_STORAGE_KEYS.apiKey,
  ])
  if (!auth?.[AUTH_STORAGE_KEYS.apiKey] || auth[AUTH_STORAGE_KEYS.enabled] === false) return

  injectCSS()
  await loadSentPosts()

  const injectAll = () => {
    if (!isExtensionContextValid()) {
      teardownContentScript()
      showContextInvalidBanner()
      return
    }

    getPostsForPlatform(platform).forEach((post) => {
      void injectButton(post, platform)
    })
  }

  let injectScheduled = false
  const scheduleInjectAll = () => {
    if (injectScheduled) return
    injectScheduled = true
    window.requestAnimationFrame(() => {
      injectScheduled = false
      injectAll()
    })
  }

  domObserver?.disconnect()
  domObserver = new MutationObserver((mutations) => {
    if (!isExtensionContextValid()) {
      teardownContentScript()
      showContextInvalidBanner()
      return
    }

    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        scheduleInjectAll()
        break
      }
    }
  })

  domObserver.observe(document.body, { childList: true, subtree: true })
  injectAll()

  injectRetryTimers.forEach((timer) => window.clearTimeout(timer))
  injectRetryTimers = [1000, 3000, 8000, 15000, 30000].map((delay) =>
    window.setTimeout(injectAll, delay)
  )
}

const startObserver = () => {
  const platform = getPlatform()
  if (!platform || !isExtensionContextValid()) return
  void runInjection(platform)
}

function bootstrapContentScript() {
  if (!isExtensionContextValid()) {
    showContextInvalidBanner()
    return
  }

  teardownContentScript()
  injectCSS()

  removeStorageListener = onLocalStorageChanged((changes, area) => {
    if (area !== "local") return

    if (changes[SENT_POSTS_STORAGE_KEY]) {
      sentPostsCache = (changes[SENT_POSTS_STORAGE_KEY].newValue as SentPostsMap) || {}
      refreshButtonsForSentPosts()
    }

    if (changes.apiKey || changes.enabled || changes.userEmail) {
      startObserver()
    }
  })

  startObserver()
}

function initWhenReady() {
  if (!isExtensionContextValid()) {
    showContextInvalidBanner()
    return
  }

  if (!document.body) {
    document.addEventListener("DOMContentLoaded", initWhenReady, { once: true })
    return
  }

  bootstrapContentScript()
}

initWhenReady()
