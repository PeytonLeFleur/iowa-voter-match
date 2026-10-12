/** Placeholder shown on pages whose research data has not been imported yet. */
export default function InProgress({ what }: { what: string }) {
  return (
    <p className="max-w-3xl border-l-2 border-rule bg-paper-deep px-4 py-3 text-ink-soft">
      {what} will appear here once the research dataset has been imported and verified.
    </p>
  )
}
