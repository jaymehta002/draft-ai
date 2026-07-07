import type { PlasmoCSConfig } from "plasmo"
import { AUTH_MESSAGE_TYPE, WEB_URL } from "~lib/config"
import {
  isExtensionContextValid,
  sendRuntimeMessage,
  showContextInvalidBanner,
} from "~lib/extension-context"

function buildConnectMatches(): string[] {
  const matches = [
    "http://localhost:3000/extension/connect*",
    "http://127.0.0.1:3000/extension/connect*",
  ]

  try {
    const url = new URL(WEB_URL)
    const origin = url.origin
    if (!matches.some((m) => m.startsWith(origin))) {
      matches.push(`${origin}/extension/connect*`)
    }
  } catch {
    // WEB_URL invalid — localhost defaults above are enough for dev
  }

  return matches
}

export const config: PlasmoCSConfig = {
  matches: buildConnectMatches(),
  run_at: "document_start",
}

if (!isExtensionContextValid()) {
  showContextInvalidBanner()
} else {
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) return
    if (event.origin !== window.location.origin) return
    if (event.data?.type !== AUTH_MESSAGE_TYPE) return
    if (!isExtensionContextValid()) {
      showContextInvalidBanner()
      return
    }

    void sendRuntimeMessage({
      type: "SAVE_AUTH",
      payload: {
        state: event.data.state,
        apiKey: event.data.apiKey,
        email: event.data.email,
        name: event.data.name,
      },
    })
  })
}
