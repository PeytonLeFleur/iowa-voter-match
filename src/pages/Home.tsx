import { useEffect, useState } from 'react'
import { getSiteInfo, type SiteInfo } from '../lib/data'

export default function Home() {
  const [info, setInfo] = useState<SiteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSiteInfo().then(setInfo).catch((e: Error) => setError(e.message))
  }, [])

  return (
    <section>
      <h1>Iowa Voter Match</h1>
      <p>Compare your views with the candidates for Governor of Iowa.</p>
      {error && <p className="error">Could not load data: {error}</p>}
      {info && (
        <p className="muted">
          Data status: {info.status} (updated {info.updated})
        </p>
      )}
    </section>
  )
}
