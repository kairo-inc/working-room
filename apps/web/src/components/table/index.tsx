import { clsx } from "clsx"
import { ReactElement } from "react"

import { L } from "../../localization"

type RowData = {
  items: (string | ReactElement)[]
  onClick?: () => void
  dataAttrs?: object
}

type TableProps = React.ComponentPropsWithoutRef<"table"> & {
  headers: string[]
  rows: RowData[]
}

export const Table = ({ headers, rows, className, ...props }: TableProps) => {
  const hasRow = rows.length > 0
  const thClassName = "px-2 py-2 text-left text-muted-foreground font-normal"
  const tdClassName = "px-2 py-2 text-left"
  return (
    <table className={clsx(className, "w-full")} {...props}>
      <thead>
        <tr className="border-b text-base">
          {headers.map((header) => (
            <th key={header} className={thClassName}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hasRow ? (
          rows.map((row, index) => (
            <tr key={index} className="hover:bg-muted bg-card border-t" {...row.dataAttrs} onClick={row.onClick}>
              {row.items.map((cell, cellIndex) => (
                <td key={cellIndex} className={tdClassName}>
                  <div className="flex items-center truncate">{cell}</div>
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={headers.length} className="text-muted-foreground bg-card py-2 text-center">
              {L.common.noDataAvailable}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
