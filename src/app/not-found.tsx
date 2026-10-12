import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl">Page not found</h1>
      <p className="mt-4 text-ink-soft">
        That page doesn’t exist. <Link href="/">Return to the home page</Link> or{' '}
        <Link href="/issues/">browse the issues</Link>.
      </p>
    </div>
  )
}
