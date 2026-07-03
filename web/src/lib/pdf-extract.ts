export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist")

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString()

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
    pages.push(text)
  }

  const text = pages.join("\n").trim()
  if (!text) {
    throw new Error("No text could be extracted from this PDF. Try a text-based PDF or paste your resume manually.")
  }

  return text
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase()

  if (ext === "pdf" || file.type === "application/pdf") {
    return extractTextFromPdf(file)
  }

  if (ext === "txt" || ext === "md" || file.type.startsWith("text/")) {
    const text = (await file.text()).trim()
    if (!text) throw new Error("The file appears to be empty.")
    return text
  }

  throw new Error("Unsupported file type. Please upload a PDF or plain-text file (.txt, .md).")
}
