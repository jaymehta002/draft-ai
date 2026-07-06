import type { PlasmoCSConfig } from "plasmo"
import { AUTH_MESSAGE_TYPE } from "~lib/config"
import {
  isExtensionContextValid,
  sendRuntimeMessage,
  showContextInvalidBanner,
} from "~lib/extension-context"

export const config: PlasmoCSConfig = {
  matches: [
    "http://localhost:3000/extension/connect*",
    "http://127.0.0.1:3000/extension/connect*",
    "https://draft-ai-ashen.vercel.app/extension/connect*",
    "https://*.vercel.app/extension/connect*"
  ],
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
