export function walkShadowTrees(node: ParentNode, callback: (root: ParentNode) => void) {
  callback(node)

  const elements = "querySelectorAll" in node ? node.querySelectorAll("*") : []
  elements.forEach((el) => {
    if (el.shadowRoot) walkShadowTrees(el.shadowRoot, callback)
  })
}

export function queryAllDeep(selector: string): HTMLElement[] {
  const results: HTMLElement[] = []
  const seen = new Set<Element>()

  walkShadowTrees(document, (root) => {
    if (!("querySelectorAll" in root)) return

    root.querySelectorAll(selector).forEach((el) => {
      if (seen.has(el)) return
      seen.add(el)
      results.push(el as HTMLElement)
    })
  })

  return results
}

export function dedupeInnermostPosts(posts: HTMLElement[]): HTMLElement[] {
  return posts.filter(
    (post) => !posts.some((other) => other !== post && post.contains(other))
  )
}

export function injectStylesIntoShadowRoots(css: string, styleId: string) {
  walkShadowTrees(document, (root) => {
    if (root === document || !("querySelector" in root)) return
    if (root.querySelector(`#${styleId}`)) return

    const style = document.createElement("style")
    style.id = styleId
    style.textContent = css
    root.appendChild(style)
  })
}
