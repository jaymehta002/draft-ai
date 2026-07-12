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
import { buildEmailPayload, migrateLegacyDraft, setDraftForPost, type DraftPreview } from "~lib/draft"
import { extractEmailFromText } from "../web/src/lib/email"
import { captureExtensionError } from "~lib/sentry"
import { markPostSent, mergeSentPosts, getSentPosts } from "~lib/sent-posts"
import { readApiError, mapApiErrorToExtensionCode } from "~lib/api-errors"
import { getExtensionErrorMessage } from "~lib/error-messages"
import {
  enqueueOfflineAction,
  getOfflineQueue,
  isRetryableFetchError,
  shiftOfflineQueue,
} from "~lib/offline-queue"

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

function bootstrapExtension() {
  migrateLegacyDraft()
  verifyAuthState().then(() => {
    syncSentPosts()
    sendHeartbeat()
    pollEngagementAnalytics()
    processOfflineQueue()
  })
  setupSidePanel()
  setupOfflineAlarm()
}

chrome.runtime.onInstalled.addListener(bootstrapExtension)
chrome.runtime.onStartup.addListener(bootstrapExtension)

function setupOfflineAlarm() {
  if (typeof chrome === "undefined" || !chrome.alarms?.create) return
  chrome.alarms.create("offline-queue-retry", { periodInMinutes: 5 })
}

if (typeof chrome !== "undefined" && chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "offline-queue-retry") {
      processOfflineQueue()
      pollEngagementAnalytics()
    }
  })
}

function setupSidePanel() {
  if (typeof chrome === "undefined" || !chrome.sidePanel?.setPanelBehavior) return
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
}

async function openSidePanelForTab(tabId?: number): Promise<boolean> {
  if (!tabId || typeof chrome === "undefined" || !chrome.sidePanel?.open) return false
  try {
    await chrome.sidePanel.open({ tabId })
    return true
  } catch (error) {
    console.error("Failed to open side panel:", error)
    captureExtensionError(error, "openSidePanel")
    return false
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const respondWithError = (error: unknown) =>
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : getExtensionErrorMessage("unknown"),
    })

  if (message.type === "DRAFT_PITCH") {
    handleDraftPitchFlow(message.payload, sender.tab?.id)
      .then(sendResponse)
      .catch(respondWithError)
    return true
  }

  if (message.type === "SEND_EMAIL") {
    handleSendEmail(message.payload)
      .then(sendResponse)
      .catch(respondWithError)
    return true
  }

  if (message.type === "RECORD_OUTREACH") {
    handleRecordOutreach(message.payload)
      .then(sendResponse)
      .catch(respondWithError)
    return true
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    openSidePanelForTab(sender.tab?.id)
      .then((opened) => sendResponse({ success: opened }))
      .catch(respondWithError)
    return true
  }

  if (message.type === "SAVE_AUTH") {
    handleSaveAuth(message.payload)
      .then(sendResponse)
      .catch(respondWithError)
    return true
  }

  if (message.type === "GET_AUTH") {
    verifyAuthState()
      .then((auth) => sendResponse({ success: true, auth }))
      .catch(respondWithError)
    return true
  }

  if (message.type === "START_CONNECT") {
    handleStartConnect()
      .then(sendResponse)
      .catch(respondWithError)
    return true
  }

  if (message.type === "DISCONNECT") {
    clearAuthState()
      .then(() => sendResponse({ success: true }))
      .catch(respondWithError)
    return true
  }

  if (message.type === "SYNC_SENT_POSTS") {
    syncSentPosts()
      .then((records) => sendResponse({ success: true, records }))
      .catch(respondWithError)
    return true
  }

  if (message.type === "GET_SENT_POSTS") {
    getSentPosts()
      .then((map) => sendResponse({ success: true, map }))
      .catch(respondWithError)
    return true
  }

  if (message.type === "MARK_POST_SENT") {
    markPostSent(message.payload.postId, message.payload.status)
      .then(() => sendResponse({ success: true }))
      .catch(respondWithError)
    return true
  }

  if (message.type === "SEND_HEARTBEAT") {
    sendHeartbeat()
      .then(() => sendResponse({ success: true }))
      .catch(respondWithError)
    return true
  }

  if (message.type === "GENERATE_VARIANT") {
    handleGenerateVariant(message.payload)
      .then(sendResponse)
      .catch(respondWithError)
    return true
  }

  if (message.type === "MARK_REPLIED") {
    handleMarkReplied(message.payload)
      .then(sendResponse)
      .catch(respondWithError)
    return true
  }
})

async function getApiKey() {
  const auth = await getAuthState()
  if (!auth?.apiKey) {
    throw new Error(getExtensionErrorMessage("not_signed_in"))
  }
  return auth.apiKey
}

async function sendHeartbeat() {
  try {
    const apiKey = await getApiKey()
    await fetch(`${API_BASE_URL}/api/extension/heartbeat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    await pollEngagementAnalytics()
  } catch {
    // Non-fatal
  }
}

async function pollEngagementAnalytics() {
  try {
    const apiKey = await getApiKey()
    const response = await fetch(`${API_BASE_URL}/api/extension/analytics`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) return

    const data = await response.json()
    const stored = await chrome.storage.local.get(["lastKnownReplied"])
    const lastKnown = (stored.lastKnownReplied as number) ?? 0
    const totalReplied = data.totalReplied ?? 0

    if (totalReplied > lastKnown) {
      await chrome.storage.local.set({ lastKnownReplied: totalReplied })
      if (typeof chrome.action?.setBadgeText === "function") {
        await chrome.action.setBadgeText({ text: "🎉" })
        await chrome.action.setBadgeBackgroundColor({ color: "#16a34a" })
        setTimeout(() => {
          getOfflineQueue().then((q) => {
            if (q.length === 0) chrome.action.setBadgeText({ text: "" })
          })
        }, 8000)
      }
    }
  } catch {
    // Non-fatal
  }
}

async function processOfflineQueue() {
  const item = await shiftOfflineQueue()
  if (!item) return

  try {
    if (item.type === "send-email") {
      await handleSendEmail(item.payload)
    } else if (item.type === "record-outreach") {
      await handleRecordOutreach(item.payload)
    }
  } catch {
    await enqueueOfflineAction({ type: item.type, payload: item.payload })
  }

  const remaining = await getOfflineQueue()
  if (remaining.length > 0 && chrome.alarms?.create) {
    chrome.alarms.create("offline-queue-retry", { delayInMinutes: 1 })
  }
}

async function setDraftPreview(draft: DraftPreview) {
  if (!draft.postId) {
    throw new Error("Draft must have a postId")
  }
  await setDraftForPost(draft.postId, draft)
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
    const limited = result as { limitReached?: boolean; upgradeUrl?: string }
    await setDraftPreview({
      ...loadingDraft,
      status: "error",
      error: result.error || "Failed to draft pitch",
      limitReached: limited.limitReached,
      upgradeUrl: limited.upgradeUrl,
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
  const resolvedEmail = extractEmailFromText(payload.text) ?? result.recipientEmail ?? payload.extractedEmail ?? null

  const readyDraftBase: DraftPreview = {
    status: "ready",
    actionMode: action_mode,
    recipientName,
    recipientEmail: resolvedEmail,
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
    updatedAt: Date.now(),
  }
  const readyDraft: DraftPreview = { ...readyDraftBase, emailPayload: buildEmailPayload(readyDraftBase) }

  await setDraftPreview(readyDraft)
  return { ...result, recipientEmail: resolvedEmail }
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
  await sendHeartbeat()

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

const DEFAULT_UPGRADE_PATH = "/dashboard/profile?tab=billing"

/** Builds a structured limit-reached result from a 402 response body. */
function limitReachedResult(data: { feature?: string; upgradeUrl?: string }) {
  const feature = data.feature
  return {
    success: false as const,
    limitReached: true as const,
    feature,
    upgradeUrl: `${WEB_URL}${data.upgradeUrl || DEFAULT_UPGRADE_PATH}`,
    error: getExtensionErrorMessage("limit_reached", {
      feature: (feature as "draft" | "email" | "follow_up" | "tone" | "tone_variant" | "tone_insight" | undefined) ?? undefined,
    }),
  }
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

    const data = await readApiError(response)

    if (response.status === 401) {
      await handleUnauthorized()
      return { success: false, error: getExtensionErrorMessage("session_expired") }
    }

    if (response.status === 402) {
      return limitReachedResult(data)
    }

    if (!response.ok) {
      const mapped = mapApiErrorToExtensionCode(response.status, data, "draft_failed")
      if (mapped.limitReached) return limitReachedResult(data)
      return { success: false, error: getExtensionErrorMessage(mapped.code, mapped.params) }
    }

    const body = data as {
      data?: {
        detected_name: string
        is_hiring_relevant: boolean
        match_score: number
        match_reason: string
        fit_highlights: string[]
        action_mode: "EMAIL" | "DM"
        outreach_payload: { subject_line: string | null; message_content: string }
      }
      draftId?: string
      cached?: boolean
      recipientEmail?: string | null
    }

    return {
      success: true,
      data: body.data,
      draftId: body.draftId,
      cached: body.cached,
      recipientEmail: body.recipientEmail ?? null,
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : getExtensionErrorMessage("draft_failed")
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

    const data = await readApiError(response)

    if (response.status === 401) {
      await handleUnauthorized()
      return { success: false, error: getExtensionErrorMessage("session_expired") }
    }

    if (!response.ok) {
      if (isRetryableFetchError(null, response)) {
        await enqueueOfflineAction({ type: "record-outreach", payload })
        return { success: false, error: getExtensionErrorMessage("offline_queued"), queued: true }
      }
      const mapped = mapApiErrorToExtensionCode(response.status, data, "record_failed")
      return { success: false, error: getExtensionErrorMessage(mapped.code, mapped.params) }
    }

    const body = payload as { postId?: string }
    if (body?.postId) {
      await markPostSent(body.postId, "COPIED")
    }

    return { success: true, sentId: data.sentId }
  } catch (error: unknown) {
    if (isRetryableFetchError(error)) {
      await enqueueOfflineAction({ type: "record-outreach", payload })
      return { success: false, error: getExtensionErrorMessage("offline_queued"), queued: true }
    }
    const message =
      error instanceof Error ? error.message : getExtensionErrorMessage("record_failed")
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

    const data = await readApiError(response)

    if (response.status === 401) {
      await handleUnauthorized()
      return { success: false, error: getExtensionErrorMessage("session_expired") }
    }

    if (response.status === 402) {
      return limitReachedResult(data)
    }

    if (!response.ok) {
      if (isRetryableFetchError(null, response)) {
        await enqueueOfflineAction({ type: "send-email", payload })
        return { success: false, error: getExtensionErrorMessage("offline_queued"), queued: true }
      }
      const mapped = mapApiErrorToExtensionCode(response.status, data, "send_failed")
      if (mapped.limitReached) return limitReachedResult(data)
      return { success: false, error: getExtensionErrorMessage(mapped.code, mapped.params) }
    }

    const body = payload as { postId?: string }
    if (body?.postId) {
      await markPostSent(body.postId, "SENT")
    }

    return { success: true }
  } catch (error: unknown) {
    if (isRetryableFetchError(error)) {
      await enqueueOfflineAction({ type: "send-email", payload })
      return { success: false, error: getExtensionErrorMessage("offline_queued"), queued: true }
    }
    const message =
      error instanceof Error ? error.message : getExtensionErrorMessage("send_failed")
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

    const data = await readApiError(response)

    if (response.status === 401) {
      await handleUnauthorized()
      return { success: false, error: getExtensionErrorMessage("session_expired") }
    }

    if (response.status === 402) {
      return limitReachedResult(data)
    }

    if (!response.ok) {
      const mapped = mapApiErrorToExtensionCode(response.status, data, "variant_failed")
      if (mapped.limitReached) return limitReachedResult(data)
      return { success: false, error: getExtensionErrorMessage(mapped.code, mapped.params) }
    }

    return { success: true, variant: data.variant, cached: data.cached }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : getExtensionErrorMessage("variant_failed")
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

    const data = await readApiError(response)

    if (response.status === 401) {
      await handleUnauthorized()
      return { success: false, error: getExtensionErrorMessage("session_expired") }
    }

    if (!response.ok) {
      const mapped = mapApiErrorToExtensionCode(response.status, data, "mark_replied_failed")
      return { success: false, error: getExtensionErrorMessage(mapped.code, mapped.params) }
    }

    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : getExtensionErrorMessage("mark_replied_failed")
    console.error("Error marking replied:", error)
    return { success: false, error: message }
  }
}

bootstrapExtension()
