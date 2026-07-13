import type { PlasmoCSConfig } from "plasmo"
import { AUTH_STORAGE_KEYS } from "~lib/config"
import { buildEmailPayload, getDraftForPost, setDraftForPost, type DraftPreview } from "~lib/draft"
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
  showContextInvalidBanner,
} from "~lib/extension-context"
import {
  SENT_POSTS_STORAGE_KEY,
  getSentPosts,
  isPostSent,
  type SentPostsMap,
} from "~lib/sent-posts"
import { getFeedPlatformFromHostname } from "~lib/platform"
import { extractEmailFromText, inferRecipientNameFromEmail } from "../../web/src/lib/email"
import { getExtensionErrorMessage } from "~lib/error-messages"

export const config: PlasmoCSConfig = {
  matches: ["*://*.x.com/*", "*://*.twitter.com/*", "*://*.linkedin.com/*"],
  run_at: "document_idle",
  all_frames: false,
}

const DRAFT_BTN_INLINE_STYLE = [
  "font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  "display:inline-flex",
  "align-items:center",
  "gap:5px",
  "background:#0a0a0a",
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
  "transform:scale(1)",
].join(";")

const POPOVER_STYLES = `
  :root, :host {
    --rp-primary: #1447e6;
    --rp-primary-hover: #103bbf;
    --rp-foreground: #0a0a0a;
    --rp-muted-foreground: #737373;
    --rp-border: #dadee4;
    --rp-destructive: #e7000b;
    --rp-success: #16a34a;
    --rp-success-hover: #15803d;
    --rp-info-bg: #eff6ff;
    --rp-info-text: #1d4ed8;
    --rp-secondary-bg: #e5e7eb;
    --rp-radius: 10px;
    --rp-radius-sm: 8px;
    --rp-ease: cubic-bezier(0.16, 1, 0.3, 1);
  }

  .rp-draft-btn {
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #0a0a0a;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    padding: 5px 12px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    margin-left: 8px;
    transform: scale(1);
    transition: background 0.15s var(--rp-ease), opacity 0.15s var(--rp-ease), transform 0.2s var(--rp-ease);
  }
  .rp-draft-btn:hover:not(:disabled) { background: #262626; }
  .rp-draft-btn:active:not(:disabled) { transform: scale(0.96); }
  .rp-draft-btn:disabled { opacity: 0.7; cursor: wait; }
  .rp-draft-btn--ready { background: var(--rp-primary); }
  .rp-draft-btn--ready:hover:not(:disabled) { background: var(--rp-primary-hover); }
  .rp-draft-btn--sent { background: var(--rp-success); }
  .rp-draft-btn--sent:hover:not(:disabled) { background: var(--rp-success-hover); }
  .rp-draft-btn--pulse { animation: rp-btn-pulse 0.4s var(--rp-ease); }
  .rp-draft-btn-wrap {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    flex-shrink: 0;
  }
  .rp-draft-btn__label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    animation: rp-label-in 0.2s var(--rp-ease);
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
    background: rgba(10, 10, 10, 0.25);
    opacity: 0;
    transition: opacity 0.18s var(--rp-ease);
    pointer-events: auto;
  }
  .rp-overlay--open .rp-backdrop { opacity: 1; }
  .rp-popover {
    position: fixed;
    z-index: 2;
    width: 360px;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #fff;
    border-radius: var(--rp-radius);
    border: 1px solid var(--rp-border);
    box-shadow: 0 12px 36px rgba(10, 10, 10, 0.16), 0 2px 8px rgba(10, 10, 10, 0.06);
    overflow: hidden;
    pointer-events: auto;
    opacity: 0;
    transform: scale(0.96) translateY(4px);
    transition: opacity 0.18s var(--rp-ease), transform 0.18s var(--rp-ease);
    transform-origin: top left;
  }
  .rp-overlay--open .rp-popover {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  .rp-popover__content {
    opacity: 1;
    transform: translateY(0) scale(1);
    transition: opacity 0.15s var(--rp-ease), transform 0.15s var(--rp-ease);
  }
  .rp-popover__content--swapping {
    opacity: 0;
    transform: translateY(2px) scale(0.995);
  }
  .rp-popover__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--rp-border);
    background: #fff;
  }
  .rp-popover__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--rp-foreground);
  }
  .rp-popover__badge {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 4px;
  }
  .rp-popover__badge--email { background: var(--rp-info-bg); color: var(--rp-info-text); }
  .rp-popover__badge--dm { background: var(--rp-secondary-bg); color: var(--rp-foreground); }
  .rp-popover__body { padding: 12px 14px; }
  .rp-popover__label {
    font-size: 11px;
    font-weight: 500;
    color: var(--rp-muted-foreground);
    margin-bottom: 5px;
    display: block;
  }
  .rp-popover__input,
  .rp-popover__textarea {
    width: 100%;
    font-size: 13px;
    line-height: 1.5;
    color: var(--rp-foreground);
    background: #fff;
    border: 1px solid var(--rp-border);
    border-radius: var(--rp-radius-sm);
    padding: 8px 10px;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.15s var(--rp-ease), box-shadow 0.15s var(--rp-ease);
  }
  .rp-popover__input:focus,
  .rp-popover__textarea:focus {
    outline: none;
    border-color: var(--rp-primary);
    box-shadow: 0 0 0 3px rgba(20, 71, 230, 0.12);
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
    padding: 14px;
  }
  .rp-popover__loading-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--rp-muted-foreground);
    font-size: 12px;
    margin-bottom: 14px;
  }
  .rp-popover__spinner {
    width: 15px;
    height: 15px;
    border: 2px solid var(--rp-border);
    border-top-color: var(--rp-primary);
    border-radius: 50%;
    animation: rp-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .rp-popover__skel {
    border-radius: var(--rp-radius-sm);
    background: linear-gradient(90deg, #eef0f3 25%, #f7f8fa 37%, #eef0f3 63%);
    background-size: 400% 100%;
    animation: rp-shimmer 1.4s ease infinite;
    margin-bottom: 10px;
  }
  .rp-popover__skel:last-child { margin-bottom: 0; }
  @keyframes rp-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes rp-spin { to { transform: rotate(360deg); } }
  @keyframes rp-label-in {
    from { opacity: 0; transform: translateY(2px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes rp-btn-pulse {
    0% { transform: scale(1); }
    40% { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  @keyframes rp-check-in {
    0% { transform: scale(0.6); opacity: 0; }
    60% { transform: scale(1.12); opacity: 1; }
    100% { transform: scale(1); }
  }
  .rp-popover__check {
    display: inline-flex;
    animation: rp-check-in 0.35s var(--rp-ease);
  }
  .rp-popover__footer {
    padding: 10px 14px 14px;
    display: flex;
    gap: 8px;
    border-top: 1px solid var(--rp-border);
  }
  .rp-popover__btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: var(--rp-radius-sm);
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background 0.15s var(--rp-ease), transform 0.15s var(--rp-ease), opacity 0.15s var(--rp-ease);
  }
  .rp-popover__btn:active:not(:disabled) { transform: scale(0.98); }
  .rp-popover__btn--primary {
    background: var(--rp-primary);
    color: #fff;
  }
  .rp-popover__btn--primary:hover:not(:disabled) { background: var(--rp-primary-hover); }
  .rp-popover__btn--primary:disabled { opacity: 0.6; cursor: wait; }
  .rp-popover__btn--secondary {
    background: #fff;
    color: var(--rp-foreground);
    border: 1px solid var(--rp-border);
  }
  .rp-popover__btn--secondary:hover { background: #f7f8fa; border-color: var(--rp-primary); }
  .rp-popover__close {
    background: none;
    border: none;
    color: #a3a3a3;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0 0 0 8px;
    transition: color 0.15s var(--rp-ease), transform 0.15s var(--rp-ease);
  }
  .rp-popover__close:hover { color: var(--rp-foreground); transform: rotate(90deg); }
  .rp-popover__error {
    padding: 16px;
    color: var(--rp-destructive);
    font-size: 13px;
    text-align: center;
  }
  .rp-popover__hint {
    font-size: 11px;
    color: #a3a3a3;
    text-align: center;
    padding: 0 14px 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    .rp-draft-btn, .rp-draft-btn__label, .rp-draft-btn--pulse,
    .rp-popover, .rp-backdrop, .rp-popover__content, .rp-popover__btn, .rp-popover__close {
      animation: none !important;
      transition: none !important;
    }
    .rp-overlay--open .rp-popover { transform: none; }
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

const normalizePostText = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const readVisibleText = (root: Element) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue ?? ""
      if (!text.trim()) return NodeFilter.FILTER_REJECT

      const parent = (node.parentElement ?? null) as Element | null
      if (!parent) return NodeFilter.FILTER_REJECT

      const tag = parent.tagName.toLowerCase()
      if (tag === "script" || tag === "style" || tag === "noscript") return NodeFilter.FILTER_REJECT

      const style = window.getComputedStyle(parent)
      if (style.display === "none" || style.visibility === "hidden") return NodeFilter.FILTER_REJECT

      return NodeFilter.FILTER_ACCEPT
    },
  })

  let out = ""
  let node: Node | null
  while ((node = walker.nextNode())) {
    out += `${node.nodeValue} `
    if (out.length > 8000) break
  }
  return normalizePostText(out)
}

const getLinkedInPostText = (post: HTMLElement) => {
  const candidates = [
    // LinkedIn frequently changes; keep this list broad but scoped to the post container.
    '[data-testid="post-content"]',
    '[data-testid="feed-shared-update__description"]',
    '[data-testid="main-feed-activity-card__commentary"]',
    '[data-testid="expandable-text-box"]',
    '[data-view-name="feed-commentary"]',
    ".update-components-text",
    ".update-components-text-view",
    ".feed-shared-update-v2__description-wrapper",
    ".feed-shared-update-v2__description",
    ".feed-shared-inline-show-more-text",
    '[class*="feed-shared-text"]',
    '[class*="update-components-text"]',
  ]

  for (const selector of candidates) {
    const el = post.querySelector(selector)
    const text = normalizePostText(el?.textContent ?? "")
    if (text.length >= 40) return text
  }

  // Fallback: read visible text but exclude UI chrome and action bars.
  const clone = post.cloneNode(true) as HTMLElement
  clone.querySelectorAll("button, [role='button'], [role='group'], nav, footer, header, svg").forEach((el) => el.remove())
  clone.querySelectorAll("a").forEach((a) => {
    // Preserve link text but avoid dumping full URLs
    a.setAttribute("href", "")
  })

  const fallback = readVisibleText(clone)
  return fallback
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
      return getLinkedInPostText(post)
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

let activeOverlay: HTMLElement | null = null
let overlayCleanup: (() => void) | null = null

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

let sentPostsCache: SentPostsMap = {}
let domObserver: MutationObserver | null = null
let removeStorageListener: (() => void) | null = null
let injectRetryTimers: number[] = []

const CONTEXT_INVALID_MSG = getExtensionErrorMessage("context_invalid")

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

/** Swaps the button's visible label with a brief fade+pulse instead of an instant text jump. */
const setButtonLabel = (button: HTMLButtonElement, html: string, pulse = true) => {
  button.innerHTML = `<span class="rp-draft-btn__label">${html}</span>`
  if (!pulse || prefersReducedMotion()) return
  button.classList.remove("rp-draft-btn--pulse")
  // Force reflow so the animation restarts if the class was already applied recently.
  void button.offsetWidth
  button.classList.add("rp-draft-btn--pulse")
}

const applySentState = (button: HTMLButtonElement) => {
  button.className = "rp-draft-btn rp-draft-btn--sent"
  button.style.cssText = DRAFT_BTN_INLINE_STYLE + ";background:#16a34a;opacity:1;cursor:default;"
  setButtonLabel(button, "✓ Sent")
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

let popoverCloseTimer: ReturnType<typeof setTimeout> | null = null

const closePopover = () => {
  overlayCleanup?.()
  overlayCleanup = null
  if (popoverPersistTimer) {
    clearTimeout(popoverPersistTimer)
    popoverPersistTimer = null
  }
  if (popoverCloseTimer) {
    clearTimeout(popoverCloseTimer)
    popoverCloseTimer = null
  }

  const overlay = activeOverlay
  activeOverlay = null
  if (!overlay) return

  if (prefersReducedMotion()) {
    overlay.remove()
    return
  }

  overlay.classList.remove("rp-overlay--open")
  popoverCloseTimer = setTimeout(() => {
    overlay.remove()
    popoverCloseTimer = null
  }, 180)
}

/** Measures the popover's real (untransformed) box via offsetWidth/Height and clamps to the viewport on all sides. */
const positionPopover = (anchor: HTMLElement, popover: HTMLElement) => {
  const rect = anchor.getBoundingClientRect()
  const popoverWidth = popover.offsetWidth || 360
  const popoverHeight = popover.offsetHeight || 200
  const margin = 8
  const edge = 16

  let left = rect.left
  if (left + popoverWidth > window.innerWidth - edge) {
    left = window.innerWidth - popoverWidth - edge
  }
  if (left < edge) left = edge

  let top = rect.bottom + margin
  if (top + popoverHeight > window.innerHeight - edge) {
    const above = rect.top - margin - popoverHeight
    top = above >= edge ? above : Math.max(edge, window.innerHeight - popoverHeight - edge)
  }

  popover.style.left = `${left}px`
  popover.style.top = `${top}px`
}

/**
 * Fades the popover's content out, swaps it via renderFn, then fades the new content in.
 * renderFn runs asynchronously (after the fade-out delay) unless reduced motion is on — pass
 * `afterRender` for anything that must run once the new DOM actually exists (e.g. binding
 * click handlers to elements renderFn just created), rather than chaining it after this call.
 */
const swapPopoverContent = (
  popover: HTMLElement,
  renderFn: (content: HTMLElement) => void,
  afterRender?: () => void
) => {
  const content = popover.querySelector<HTMLElement>(".rp-popover__content")
  if (!content) return

  if (prefersReducedMotion()) {
    renderFn(content)
    afterRender?.()
    return
  }

  content.classList.add("rp-popover__content--swapping")
  window.setTimeout(() => {
    renderFn(content)
    afterRender?.()
    void content.offsetWidth
    requestAnimationFrame(() => {
      content.classList.remove("rp-popover__content--swapping")
    })
  }, 120)
}

const renderPopoverLoading = (content: HTMLElement, recipientName: string) => {
  content.innerHTML = `
    <div class="rp-popover__header">
      <span class="rp-popover__title">Drafting outreach</span>
    </div>
    <div class="rp-popover__loading">
      <div class="rp-popover__loading-row">
        <div class="rp-popover__spinner"></div>
        <span>Writing for ${rpEscapeHtml(recipientName || "this post")}...</span>
      </div>
      <div class="rp-popover__skel" style="height:32px;width:65%"></div>
      <div class="rp-popover__skel" style="height:92px;width:100%"></div>
      <div class="rp-popover__skel" style="height:13px;width:45%;margin-bottom:0"></div>
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

const bindPopoverEditing = (popover: HTMLElement, postId?: string) => {
  popover.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("input", () => {
      if (popoverPersistTimer) clearTimeout(popoverPersistTimer)
      popoverPersistTimer = setTimeout(() => {
        const { message, subject } = getPopoverDraftValues(popover)
        persistDraftEdits(message, subject, undefined, postId)
      }, 400)
    })
  })
}

const renderPopoverReady = (content: HTMLElement, draft: DraftPreview) => {
  const isEmail = draft.actionMode === "EMAIL"
  const badgeClass = isEmail ? "rp-popover__badge--email" : "rp-popover__badge--dm"

  content.innerHTML = `
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

  bindPopoverEditing(content, draft.postId)
}

const renderPopoverSent = (content: HTMLElement) => {
  content.innerHTML = `
    <div class="rp-popover__header">
      <span class="rp-popover__title">Sent</span>
      <button type="button" class="rp-popover__close" aria-label="Close">&times;</button>
    </div>
    <div class="rp-popover__body" style="text-align:center;padding:24px 14px">
      <span class="rp-popover__check" style="color:var(--rp-success);font-size:22px;line-height:1;margin-bottom:8px">&#10003;</span>
      <p style="font-size:13px;color:var(--rp-muted-foreground);margin-top:8px">Your email was sent.</p>
    </div>
  `
  bindAction(content.querySelector(".rp-popover__close"), closePopover)
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
    await persistDraftEdits(message, subject, undefined, draft.postId)
    const opened = await sendRuntimeMessage({ type: "OPEN_SIDE_PANEL" })
    if (opened === null) {
      swapPopoverContent(popover, (content) => renderPopoverError(content, CONTEXT_INVALID_MSG))
      return
    }
    closePopover()
  })

  bindAction(popover.querySelector('[data-action="primary"]'), async () => {
    const primaryBtn = popover.querySelector('[data-action="primary"]') as HTMLButtonElement
    const { message, subject } = getPopoverDraftValues(popover)
    await persistDraftEdits(message, subject, undefined, draft.postId)

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
          swapPopoverContent(popover, (content) => renderPopoverError(content, CONTEXT_INVALID_MSG))
          return
        }
        applySentState(button)
      }
      primaryBtn.innerHTML = `<span class="rp-popover__check">&#10003;</span> Copied`
      setTimeout(closePopover, 1200)
      return
    }

    const emailPayload = buildEmailPayload(draft, { subject, body: message })
    if (!emailPayload) {
      swapPopoverContent(popover, (content) =>
        renderPopoverError(content, getExtensionErrorMessage("email_send_unavailable"))
      )
      return
    }

    primaryBtn.disabled = true
    primaryBtn.textContent = "Sending…"

    const sendResponse = await sendRuntimeMessage<{ success: boolean; error?: string }>({
      type: "SEND_EMAIL",
      payload: emailPayload,
    })

    if (sendResponse === null) {
      primaryBtn.disabled = false
      primaryBtn.textContent = "Send email"
      swapPopoverContent(popover, (content) => renderPopoverError(content, CONTEXT_INVALID_MSG))
      return
    }

    if (!sendResponse.success) {
      primaryBtn.disabled = false
      primaryBtn.textContent = "Send email"
      swapPopoverContent(popover, (content) =>
        renderPopoverError(content, sendResponse?.error || getExtensionErrorMessage("send_failed"))
      )
      return
    }

    applySentState(button)
    swapPopoverContent(popover, renderPopoverSent)

    if (draft.postId) {
      await setDraftForPost(draft.postId, {
        ...draft,
        status: "sent",
        message,
        subject,
        updatedAt: Date.now(),
      })
    }
  })
}

const showReadyPopover = (anchor: HTMLElement, draft: DraftPreview, button: HTMLButtonElement) => {
  const popover = openPopover(anchor, draft.recipientName, false)
  swapPopoverContent(
    popover,
    (content) => renderPopoverReady(content, draft),
    () => bindReadyPopoverActions(popover, draft, button)
  )
}

const renderPopoverError = (content: HTMLElement, message: string) => {
  content.innerHTML = `
    <div class="rp-popover__header">
      <span class="rp-popover__title">Draft failed</span>
      <button type="button" class="rp-popover__close" aria-label="Close">&times;</button>
    </div>
    <div class="rp-popover__error">${rpEscapeHtml(message)}</div>
  `
  bindAction(content.querySelector(".rp-popover__close"), closePopover)
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

  const content = document.createElement("div")
  content.className = "rp-popover__content"
  popover.appendChild(content)

  overlay.appendChild(backdrop)
  overlay.appendChild(popover)
  document.body.appendChild(overlay)
  activeOverlay = overlay

  if (showLoading) {
    renderPopoverLoading(content, recipientName)
  }
  positionPopover(anchor, popover)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add("rp-overlay--open")
    })
  })

  const onScroll = () => positionPopover(anchor, popover)
  const onResize = () => positionPopover(anchor, popover)
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closePopover()
  }
  window.addEventListener("scroll", onScroll, true)
  window.addEventListener("resize", onResize)
  window.addEventListener("keydown", onKeydown, true)

  const resizeObserver = new ResizeObserver(() => positionPopover(anchor, popover))
  resizeObserver.observe(popover)

  overlayCleanup = () => {
    window.removeEventListener("scroll", onScroll, true)
    window.removeEventListener("resize", onResize)
    window.removeEventListener("keydown", onKeydown, true)
    resizeObserver.disconnect()
  }

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
  setButtonLabel(
    button,
    `<span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:rp-spin 0.7s linear infinite"></span> Drafting…`,
    false
  )

  const email = extractEmailFromText(text)
  const emailRecipientName = email ? inferRecipientNameFromEmail(email) : null

  const popover = openPopover(button, emailRecipientName || name)

  try {
    // Guardrail: LinkedIn DOM often collapses content behind "See more".
    // If we can't extract enough post text, don't send a low-context request (it yields generic templates).
    const minChars = platform.id === "LINKEDIN" ? 60 : 20
    if (normalizePostText(text).length < minChars) {
      throw new Error(
        getExtensionErrorMessage("insufficient_post_text", { platform: platform.id })
      )
    }

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
      recipientEmail?: string | null
    }>({ type: "DRAFT_PITCH", payload })

    if (response === null) {
      throw new Error(CONTEXT_INVALID_MSG)
    }

    if (!response.success) {
      throw new Error(response.error || "Failed to draft pitch")
    }

    if (!response.data) {
      throw new Error(getExtensionErrorMessage("draft_failed"))
    }

    const {
      action_mode,
      outreach_payload,
      detected_name,
      is_hiring_relevant,
      match_score,
      match_reason,
      fit_highlights,
    } = response.data
    const displayRecipientName = emailRecipientName || name || "Unknown"
    const resolvedEmail = email ?? response.recipientEmail ?? null
    const draftBase: DraftPreview = {
      status: "ready",
      actionMode: action_mode as "EMAIL" | "DM",
      recipientName: displayRecipientName,
      recipientEmail: resolvedEmail,
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
      updatedAt: Date.now(),
    }
    const draft: DraftPreview = { ...draftBase, emailPayload: buildEmailPayload(draftBase) }

    const setButtonReady = () => {
      button.className = "rp-draft-btn rp-draft-btn--ready"
      setButtonLabel(button, "View draft")
      button.disabled = false
      button.dataset.draftReady = "true"
      button.dataset.recipientName = displayRecipientName
    }

    showReadyPopover(button, draft, button)
    setButtonReady()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to draft pitch"
    swapPopoverContent(popover, (content) => renderPopoverError(content, message))
    button.className = "rp-draft-btn"
    setButtonLabel(button, "Draft", false)
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
  setButtonLabel(button, "Draft", false)

  button.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (button.dataset.postSent === "true") return

    if (button.dataset.draftReady === "true") {
      const postId = button.dataset.draftAiPostId
      if (!postId) return
      const draft = await getDraftForPost(postId)
      if (draft?.message) {
        showReadyPopover(button, draft, button)
      }
      return
    }
    handleDraftClick(button, post, platform)
  })

  appendDraftButton(injectionTarget, button)
}

let injectionRunning: Promise<void> | null = null

const runInjection = async (platform: PlatformConfig) => {
  if (injectionRunning) {
    await injectionRunning
    return
  }

  injectionRunning = (async () => {
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
  })()

  try {
    await injectionRunning
  } finally {
    injectionRunning = null
  }
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
