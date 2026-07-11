import type { PlasmoCSConfig } from "plasmo"
import {
  AUTH_STORAGE_KEYS,
  EXTENSION_PING_TYPE,
  EXTENSION_PONG_TYPE,
} from "~lib/config"
import { getLocalStorage, isExtensionContextValid } from "~lib/extension-context"

// NOTE: Plasmo extracts this `config` object statically at build time, so
// `matches` MUST be a literal array — keep hosts in sync with deployed web origin(s).
export const config: PlasmoCSConfig = {
  matches: [
    "http://localhost:3000/onboarding*",
    "http://127.0.0.1:3000/onboarding*",
    "https://draft-ai-ashen.vercel.app/onboarding*",
    "https://*.vercel.app/onboarding*",
    "https://draft-ai.jayymehta.in/onboarding*",
  ],
  run_at: "document_start",
}

if (isExtensionContextValid()) {
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) return
    if (event.origin !== window.location.origin) return
    if (event.data?.type !== EXTENSION_PING_TYPE) return

    void getLocalStorage<Record<string, string>>(AUTH_STORAGE_KEYS.apiKey).then((storage) => {
      window.postMessage(
        {
          type: EXTENSION_PONG_TYPE,
          connected: Boolean(storage?.[AUTH_STORAGE_KEYS.apiKey]),
        },
        window.location.origin
      )
    })
  })
}
