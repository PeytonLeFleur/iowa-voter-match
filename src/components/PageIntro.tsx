export default function PageIntro({ eyebrow, title, children }: {
  eyebrow?: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="mb-10 max-w-3xl">
      {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      {children && <div className="mt-4 text-lg text-ink-soft">{children}</div>}
    </header>
  )
}
