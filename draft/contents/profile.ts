import type { PlasmoCSConfig } from "plasmo"
import {
  isExtensionContextValid,
  sendRuntimeMessage,
  showContextInvalidBanner,
} from "~lib/extension-context"
import { getExtensionErrorMessage } from "~lib/error-messages"
import {
  buildLinkedInProfilePostId,
  getLinkedInProfilePublicId,
} from "~lib/platform"

export const config: PlasmoCSConfig = {
  matches: ["*://*.linkedin.com/in/*"],
  run_at: "document_idle",
  all_frames: false,
}

const BTN_ID = "draft-ai-profile-btn"
const CONTEXT_INVALID_MSG = getExtensionErrorMessage("context_invalid")

const BTN_STYLE = [
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  "display:inline-flex",
  "align-items:center",
  "gap:6px",
  "background:#1447e6",
  "color:#fff",
  "font-size:13px",
  "font-weight:600",
  "padding:8px 14px",
  "border-radius:8px",
  "border:none",
  "cursor:pointer",
  "margin-left:12px",
  "vertical-align:middle",
].join(";")

function getProfileName(): string {
  const selectors = [
    "h1.text-heading-xlarge",
    ".pv-text-details__left-panel h1",
    "main h1",
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    const text = el?.textContent?.trim()
    if (text) return text
  }
  return "Unknown"
}

function getProfileHeadline(): string {
  const selectors = [
    ".text-body-medium.break-words",
    ".pv-text-details__left-panel .text-body-medium",
    "[data-generated-suggestion-target] ~ div",
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    const text = el?.textContent?.trim()
    if (text && text.length < 200) return text
  }
  return ""
}

function getAboutText(): string {
  const about = document.querySelector("#about ~ .display-flex .inline-show-more-text, section[data-section='summary'] .inline-show-more-text, #about + div span[aria-hidden='true']")
  return about?.textContent?.trim().slice(0, 1500) || ""
}

function buildProfileContextText(): string {
  const name = getProfileName()
  const headline = getProfileHeadline()
  const about = getAboutText()
  const parts = [`LinkedIn profile: ${name}`]
  if (headline) parts.push(`Headline: ${headline}`)
  if (about) parts.push(`About: ${about}`)
  return parts.join("\n")
}

function findInjectionAnchor(): HTMLElement | null {
  const selectors = [
    ".pv-text-details__left-panel h1",
    "h1.text-heading-xlarge",
    "main section:first-of-type h1",
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el?.parentElement) return el.parentElement as HTMLElement
  }
  return document.querySelector("main") as HTMLElement | null
}

function createButton(): HTMLButtonElement {
  const btn = document.createElement("button")
  btn.id = BTN_ID
  btn.type = "button"
  btn.setAttribute("style", BTN_STYLE)
  btn.textContent = "Draft intro"
  return btn
}

async function handleDraftIntro() {
  if (!isExtensionContextValid()) {
    showContextInvalidBanner()
    return
  }

  const publicId = getLinkedInProfilePublicId(window.location.pathname)
  if (!publicId) return

  const name = getProfileName()
  const text = buildProfileContextText()
  const postId = buildLinkedInProfilePostId(publicId)
  const postUrl = window.location.href.split("?")[0]
  const recipientProfileUrl = postUrl

  const response = await sendRuntimeMessage({
    type: "DRAFT_PITCH",
    payload: {
      text,
      name,
      hasEmail: false,
      extractedEmail: null,
      postId,
      postUrl,
      platform: "LINKEDIN_PROFILE",
      recipientProfileUrl,
      recipientHandle: publicId,
    },
  })

  if (!response?.success) {
    alert(response?.error || getExtensionErrorMessage("draft_failed"))
    return
  }

  await sendRuntimeMessage({ type: "OPEN_SIDE_PANEL" })
}

function injectProfileButton() {
  if (document.getElementById(BTN_ID)) return

  const anchor = findInjectionAnchor()
  if (!anchor) return

  const btn = createButton()
  btn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    void handleDraftIntro()
  })

  anchor.appendChild(btn)
}

function init() {
  injectProfileButton()

  const observer = new MutationObserver(() => {
    if (!isExtensionContextValid()) {
      observer.disconnect()
      return
    }
    injectProfileButton()
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
