import dayjs from "dayjs"
import { ComponentPropsWithoutRef } from "react"

import { L } from "../../../localization"
import { AppTokenUsageOnTenant } from "../../../types/tokenUsage"
import { Table } from "../../table"

const round = (num: number) => {
  return Math.ceil(num / 1000).toLocaleString()
}

type TokenUsageTableProps = ComponentPropsWithoutRef<"table"> & {
  data: AppTokenUsageOnTenant[]
}

export const TokenUsageTable = ({ data, ...props }: TokenUsageTableProps) => {
  return (
    <Table
      {...props}
      headers={[
        { label: L.setting.tokenUsage.date },
        { label: L.setting.tokenUsage.model },
        { label: L.setting.tokenUsage.inputCached },
        { label: L.setting.tokenUsage.output },
      ]}
      rows={data.map((d) => ({
        items: [
          dayjs(d.createdAt).format("YYYY-MM-DD"),
          `${d.provider}:${d.model.replace(`${d.provider}:`, "")}`,
          `${round(d.inputTokens)}k (${round(d.cachedInputTokens)}k)`,
          `${round(d.outputTokens)}k`,
        ],
      }))}
    />
  )
}
