interface PaneProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PaneLayout = ({ children }: PaneProps) => {
  return <div className="border-border bg-card rounded-md border p-6">{children}</div>
}
