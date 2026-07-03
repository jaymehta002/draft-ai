export type LocationSuggestion = {
  id: string
  label: string
  city: string
  state: string
  postcode: string
  country: string
}

type PhotonFeature = {
  properties: {
    name?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    countrycode?: string
    street?: string
    district?: string
  }
}

type PhotonResponse = {
  features: PhotonFeature[]
}

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=8&lang=en`
  )

  if (!res.ok) return []

  const data = (await res.json()) as PhotonResponse

  return data.features
    .map((feature, index) => {
      const p = feature.properties
      const city = p.city || p.name || ""
      const state = p.state || p.district || ""
      const postcode = p.postcode || ""
      const country = p.country || ""

      if (!city) return null

      const label = formatLocationLabel({ city, state, postcode, country })
      return {
        id: `${city}-${state}-${postcode}-${index}`,
        label,
        city,
        state,
        postcode,
        country,
      }
    })
    .filter((s): s is LocationSuggestion => s !== null)
}

export function formatLocationLabel(parts: {
  city: string
  state: string
  postcode: string
  country: string
}): string {
  const segments: string[] = [parts.city]
  if (parts.state) segments.push(parts.state)
  if (parts.country && parts.country !== "United States") segments.push(parts.country)
  let result = segments.join(", ")
  if (parts.postcode) result += ` ${parts.postcode}`
  return result
}

export function formatLocation(suggestion: LocationSuggestion): string {
  return formatLocationLabel(suggestion)
}

/** Location from resume likely needs geocoding if it has no state/postcode signal */
export function needsGeocodingResolution(location: string): boolean {
  const trimmed = location.trim()
  if (!trimmed) return true
  // Has postcode pattern or "City, State" comma pattern → likely resolved
  if (/\d{4,}/.test(trimmed)) return false
  if (trimmed.includes(",")) return false
  return true
}
