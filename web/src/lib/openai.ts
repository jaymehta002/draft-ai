import "server-only"

import OpenAI from "openai"

export const OPENAI_MODEL = "gpt-4o-mini"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
