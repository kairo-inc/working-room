import dayjs from "dayjs"
import { ComponentPropsWithoutRef } from "react"

import { calculateTokenUsageCost } from "@wr/shared"

import { L } from "../../../localization"
import { AppTokenUsageOnTenant } from "../../../types/tokenUsage"
import { Table } from "../../table"

type TokenUsageTableProps = ComponentPropsWithoutRef<"table"> & {
  data: AppTokenUsageOnTenant[]
}

export const TokenUsageTable = ({ data, ...props }: TokenUsageTableProps) => {
  return (
    <Table
      {...props}
      headers={[{ label: L.setting.tokenUsage.date }, { label: L.setting.tokenUsage.model }, { label: L.setting.tokenUsage.cost }]}
      rows={data.map((d) => ({
        items: [
          dayjs(d.createdAt).format("YYYY-MM-DD"),
          `${d.provider}:${d.model.replace(`${d.provider}:`, "")}`,
          `$${calculateTokenUsageCost(d).toFixed(2)}`,
        ],
      }))}
    />
  )
}
