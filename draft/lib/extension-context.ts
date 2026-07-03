export function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id)
  } catch {
    return false
  }
}

export function sendRuntimeMessage<T = unknown>(message: unknown): Promise<T | null> {
  return new Promise((resolve) => {
    if (!isExtensionContextValid()) {
      resolve(null)
      return
    }

    try {
      chrome.runtime.sendMessage(message, (response) => {
        void chrome.runtime.lastError
        resolve((response as T) ?? null)
      })
    } catch {
      resolve(null)
    }
  })
}

export async function getLocalStorage<T extends Record<string, unknown>>(
  keys: string | string[] | Record<string, unknown>
): Promise<T | null> {
  if (!isExtensionContextValid()) return null

  try {
    return (await chrome.storage.local.get(keys)) as T
  } catch {
    return null
  }
}

export async function setLocalStorage(items: Record<string, unknown>): Promise<boolean> {
  if (!isExtensionContextValid()) return false

  try {
    await chrome.storage.local.set(items)
    return true
  } catch {
    return false
  }
}

export function onLocalStorageChanged(
  listener: Parameters<typeof chrome.storage.onChanged.addListener>[0]
): () => void {
  if (!isExtensionContextValid()) return () => {}

  try {
    chrome.storage.onChanged.addListener(listener)
    return () => {
      try {
        chrome.storage.onChanged.removeListener(listener)
      } catch {
        // context may already be gone
      }
    }
  } catch {
    return () => {}
  }
}

export function showContextInvalidBanner() {
  if (document.getElementById("rp-context-invalid")) return

  const el = document.createElement("button")
  el.id = "rp-context-invalid"
  el.type = "button"
  el.textContent = "Draft AI updated — click to reload page"
  el.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:2147483647",
    "padding:10px 14px",
    "border:none",
    "border-radius:8px",
    "background:#171717",
    "color:#fff",
    "font:500 12px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "cursor:pointer",
    "box-shadow:0 4px 16px rgba(0,0,0,0.2)",
  ].join(";")
  el.addEventListener("click", () => window.location.reload())
  document.documentElement.appendChild(el)
}
