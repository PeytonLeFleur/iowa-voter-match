// Data access layer. Today every call reads static JSON shipped in
// public/data/. To move to a backend later, point VITE_DATA_URL at the API
// (or swap these function bodies) — components only call these functions.
const DATA_URL = (import.meta.env.VITE_DATA_URL ?? `${import.meta.env.BASE_URL}data`).replace(/\/$/, '')

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${DATA_URL}/${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export interface SiteInfo {
  status: string
  updated: string
}

export const getSiteInfo = () => getJSON<SiteInfo>('site.json')
