export function FormField({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}
