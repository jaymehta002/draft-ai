export {}

import {
  API_BASE_URL,
  AUTH_STORAGE_KEYS,
  WEB_URL,
} from "~lib/config"
import {
  clearAuthState,
  generateConnectState,
  getAuthState,
  saveAuthState,
  verifyAuthState,
} from "~lib/auth"
import { DRAFT_STORAGE_KEY, type DraftPreview } from "~lib/draft"
import { markPostSent, mergeSentPosts, getSentPosts } from "~lib/sent-posts"

async function syncSentPosts() {
  try {
    const apiKey = await getApiKey()
    const response = await fetch(`${API_BASE_URL}/api/extension/sent-posts`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) return []

    const data = await response.json()
    if (data.records?.length) {
      await mergeSentPosts(data.records)
    }
    return data.records || []
  } catch {
    return []
  }
}

chrome.runtime.onInstalled.addListener(() => {
  verifyAuthState().then(() => syncSentPosts())
  setupSidePanel()
})

chrome.runtime.onStartup.addListener(() => {
  verifyAuthState().then(() => syncSentPosts())
  setupSidePanel()
})

function setupSidePanel() {
  if (typeof chrome === "undefined" || !chrome.sidePanel?.setPanelBehavior) return
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
}

async function openSidePanelForTab(tabId?: number) {
  if (!tabId || typeof chrome === "undefined" || !chrome.sidePanel?.open) return
  try {
    await chrome.sidePanel.open({ tabId })
  } catch (error) {
    console.error("Failed to open side panel:", error)
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DRAFT_PITCH") {
    handleDraftPitchFlow(message.payload, sender.tab?.id)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "SEND_EMAIL") {
    handleSendEmail(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "RECORD_OUTREACH") {
    handleRecordOutreach(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    openSidePanelForTab(sender.tab?.id)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "SAVE_AUTH") {
    handleSaveAuth(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "GET_AUTH") {
    verifyAuthState()
      .then((auth) => sendResponse({ success: true, auth }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "START_CONNECT") {
    handleStartConnect()
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "DISCONNECT") {
    clearAuthState()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "SYNC_SENT_POSTS") {
    syncSentPosts()
      .then((records) => sendResponse({ success: true, records }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "GET_SENT_POSTS") {
    getSentPosts()
      .then((map) => sendResponse({ success: true, map }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "MARK_POST_SENT") {
    markPostSent(message.payload.postId, message.payload.status)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "GENERATE_VARIANT") {
    handleGenerateVariant(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (message.type === "MARK_REPLIED") {
    handleMarkReplied(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
})

async function getApiKey() {
  const auth = await getAuthState()
  if (!auth?.apiKey) {
    throw new Error("Not signed in. Open the extension popup and sign in with your dashboard.")
  }
  return auth.apiKey
}

async function setDraftPreview(draft: DraftPreview) {
  await chrome.storage.local.set({
    [DRAFT_STORAGE_KEY]: { ...draft, updatedAt: Date.now() },
  })
}

async function handleDraftPitchFlow(payload: {
  text: string
  name: string
  hasEmail: boolean
  extractedEmail: string | null
  emailRecipientName?: string | null
  postId: string
  postUrl?: string | null
  platform: string
  recipientHandle?: string | null
  recipientProfileUrl?: string | null
}, tabId?: number) {
  const recipientName = payload.emailRecipientName || payload.name || "Unknown"
  const loadingDraft: DraftPreview = {
    status: "loading",
    actionMode: payload.hasEmail ? "EMAIL" : "DM",
    recipientName,
    recipientEmail: payload.extractedEmail,
    recipientHandle: payload.recipientHandle || undefined,
    recipientProfileUrl: payload.recipientProfileUrl || undefined,
    postId: payload.postId,
    postUrl: payload.postUrl || undefined,
    platform: payload.platform,
    message: "",
    sourceText: payload.text,
    updatedAt: Date.now(),
  }

  await setDraftPreview(loadingDraft)
  // Side panel opens only on explicit user gesture via OPEN_SIDE_PANEL message

  const result = await handleDraftPitch(payload)

  if (!result.success || !result.data) {
    await setDraftPreview({
      ...loadingDraft,
      status: "error",
      error: result.error || "Failed to draft pitch",
    })
    return result
  }

  const {
    action_mode,
    outreach_payload,
    detected_name,
    is_hiring_relevant,
    match_score,
    match_reason,
    fit_highlights,
  } = result.data
  const { subject_line, message_content } = outreach_payload

  const readyDraft: DraftPreview = {
    status: "ready",
    actionMode: action_mode,
    recipientName,
    recipientEmail: payload.extractedEmail,
    detectedName: detected_name || recipientName,
    recipientHandle: payload.recipientHandle || undefined,
    recipientProfileUrl: payload.recipientProfileUrl || undefined,
    subject: subject_line,
    message: message_content,
    sourceText: payload.text,
    matchInsight: {
      score: match_score,
      reason: match_reason,
      highlights: fit_highlights,
      relevant: is_hiring_relevant,
    },
    postId: payload.postId,
    postUrl: payload.postUrl || undefined,
    platform: payload.platform,
    draftId: result.draftId,
    cached: result.cached,
    emailPayload:
      action_mode === "EMAIL" && payload.extractedEmail
        ? {
            to: payload.extractedEmail,
            subject: subject_line || "",
            body: message_content,
            postId: payload.postId,
            postUrl: payload.postUrl || undefined,
            platform: payload.platform,
            draftId: result.draftId,
            recipientName,
            recipientHandle: payload.recipientHandle || undefined,
            recipientProfileUrl: payload.recipientProfileUrl || undefined,
          }
        : undefined,
    updatedAt: Date.now(),
  }

  await setDraftPreview(readyDraft)
  return result
}

async function handleSaveAuth(payload: {
  state: string
  apiKey: string
  email: string
  name: string | null
}) {
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEYS.pendingConnectState)
  const pendingState = stored[AUTH_STORAGE_KEYS.pendingConnectState]

  if (!pendingState || pendingState !== payload.state) {
    throw new Error("Connection state mismatch. Please try connecting again.")
  }

  await saveAuthState({
    apiKey: payload.apiKey,
    userEmail: payload.email,
    userName: payload.name,
    connectedAt: new Date().toISOString(),
  })

  await syncSentPosts()

  return { success: true }
}

async function handleStartConnect() {
  const state = generateConnectState()

  await chrome.storage.local.set({
    [AUTH_STORAGE_KEYS.pendingConnectState]: state,
  })

  const connectUrl = `${WEB_URL}/extension/connect?state=${state}`
  await chrome.tabs.create({ url: connectUrl })

  return { success: true, state }
}

async function handleUnauthorized() {
  await clearAuthState()
}

async function handleDraftPitch(payload: unknown) {
  try {
    const apiKey = await getApiKey()

    const response = await fetch(`${API_BASE_URL}/api/match-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (response.status === 401) {
      await handleUnauthorized()
      throw new Error("Session expired. Please sign in again from the extension popup.")
    }

    if (!response.ok) {
      throw new Error(data.error || "Failed to draft pitch")
    }

    return {
      success: true,
      data: data.data,
      draftId: data.draftId as string | undefined,
      cached: data.cached as boolean | undefined,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to draft pitch"
    console.error("Error fetching pitch:", error)
    return { success: false, error: message }
  }
}

async function handleRecordOutreach(payload: unknown) {
  try {
    const apiKey = await getApiKey()

    const response = await fetch(`${API_BASE_URL}/api/record-outreach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (response.status === 401) {
      await handleUnauthorized()
      throw new Error("Session expired. Please sign in again from the extension popup.")
    }

    if (!response.ok) {
      throw new Error(data.error || "Failed to record outreach")
    }

    const body = payload as { postId?: string }
    if (body?.postId) {
      await markPostSent(body.postId, "COPIED")
    }

    return { success: true, sentId: data.sentId }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record outreach"
    console.error("Error recording outreach:", error)
    return { success: false, error: message }
  }
}

async function handleSendEmail(payload: unknown) {
  try {
    const apiKey = await getApiKey()

    const response = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (response.status === 401) {
      await handleUnauthorized()
      throw new Error("Session expired. Please sign in again from the extension popup.")
    }

    if (!response.ok) {
      throw new Error(data.error || "Failed to send email")
    }

    const body = payload as { postId?: string }
    if (body?.postId) {
      await markPostSent(body.postId, "SENT")
    }

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send email"
    console.error("Error sending email:", error)
    return { success: false, error: message }
  }
}

async function handleGenerateVariant(payload: { postId: string; alternateTone: string }) {
  try {
    const apiKey = await getApiKey()

    const response = await fetch(`${API_BASE_URL}/api/match-job/variant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (response.status === 401) {
      await handleUnauthorized()
      throw new Error("Session expired. Please sign in again from the extension popup.")
    }

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate variant")
    }

    return { success: true, variant: data.variant, cached: data.cached }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate variant"
    console.error("Error generating variant:", error)
    return { success: false, error: message }
  }
}

async function handleMarkReplied(payload: { outreachId: string }) {
  try {
    const apiKey = await getApiKey()

    const response = await fetch(`${API_BASE_URL}/api/extension/mark-replied`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (response.status === 401) {
      await handleUnauthorized()
      throw new Error("Session expired. Please sign in again from the extension popup.")
    }

    if (!response.ok) {
      throw new Error(data.error || "Failed to mark as replied")
    }

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to mark as replied"
    console.error("Error marking replied:", error)
    return { success: false, error: message }
  }
}

setupSidePanel()
