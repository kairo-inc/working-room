import clsx from "clsx"
import { FormApi } from "final-form"
import { Field } from "react-final-form"

import { RectangleButton, RectangleButtonProps } from "../../../components/buttons/rectangleButton"
import { Route } from "../../../route"
import { AppChatNeedApproval } from "../../../types/chat"
import { FileIconSm } from "../../file/item"

export type ChatInputApprovalType = {
  [approvalId: string]: boolean | undefined
}

export type ChatInputApprovalSubmitFn = (
  values: ChatInputApprovalType,
  form: FormApi<ChatInputApprovalType, Partial<ChatInputApprovalType>>
) => Promise<void>

export const ApprovalMessage = ({
  onDecide,
  needApproval,
}: {
  onDecide: (approvalId: string, approval: "approve" | "reject") => void
  needApproval: AppChatNeedApproval
}) => {
  const buildDifference = (approval: AppChatNeedApproval) => {
    const { toolType, change } = approval
    const targetFiles = change?.files ?? null
    let diff = change?.change?.trim() ?? ""
    const lines = diff.split("\n")
    const index = lines.findIndex((line) => line.startsWith("@@"))
    if (index !== -1) {
      diff = lines.slice(index + 1).join("\n")
    }
    return (
      <div>
        {targetFiles?.map((file, i) => {
          const route = file.mimeType === "inode/directory" ? Route.tree(file.descId) : Route.file(file.descId)
          if (toolType === "delete") {
            return (
              <a href={route} target="_blank" rel="noopener noreferrer" key={i} className="block">
                <div className="bg-destructive/10 text-destructive mb-1 inline-flex items-center px-1 py-1 text-sm hover:underline">
                  <FileIconSm className="text-destructive mr-2 inline-block" type={file.mimeType} />
                  {file.path}
                </div>
              </a>
            )
          } else if (toolType === "create") {
            return (
              <a href={route} target="_blank" rel="noopener noreferrer" key={i} className="block">
                <div className="bg-success/10 text-success mb-1 inline-flex items-center px-1 py-1 text-sm hover:underline">
                  <FileIconSm className="text-success mr-2 inline-block" type={file.mimeType} />
                  {file.path}
                </div>
              </a>
            )
          } else {
            return (
              <a href={route} target="_blank" rel="noopener noreferrer" key={i} className="block">
                <div className="mb-1 inline-flex items-center px-1 py-1 text-sm hover:underline">
                  <FileIconSm className="mr-2 inline-block" type={file.mimeType} />
                  {file.path}
                </div>
              </a>
            )
          }
        })}
        {diff.split("\n").map((line, i) => {
          let className = "text-muted-foreground bg-muted/10"
          if (line.startsWith("+") && !line.startsWith("+++")) {
            className = "text-success bg-success/10"
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            className = "text-destructive bg-destructive/10"
          }
          if (line.includes("No newline at end of file")) {
          } else {
            return (
              <div key={i} className={className}>
                {line}
              </div>
            )
          }
        })}
      </div>
    )
  }

  return (
    <div className={clsx("bg-card my-2 flex flex-col gap-2 rounded-sm p-4")}>
      <span className="inline-block text-sm">
        <span className="text-primary mr-2 font-bold">{needApproval.toolName}</span>
        <span className="text-primary">{">>"}</span>
      </span>
      <div className="pl-8">
        <Field
          key={needApproval.approvalId}
          name={needApproval.approvalId}
          render={({ input }) => {
            const approveVariant: RectangleButtonProps["variant"] =
              input.value === undefined || input.value === "" ? "default" : input.value ? "approve" : "notApprove"
            const rejectVariant: RectangleButtonProps["variant"] =
              input.value === undefined || input.value === "" ? "defaultOutline" : !input.value ? "reject" : "notReject"
            return (
              <div className="flex flex-col gap-4">
                <div>Need approval for {needApproval.toolType} content. Do you approve this change?</div>
                {buildDifference(needApproval)}
                <div className="flex justify-end gap-4">
                  <RectangleButton
                    type="button"
                    size="default"
                    variant={approveVariant}
                    onClick={() => onDecide(needApproval.approvalId, "approve")}
                  >
                    Approve
                  </RectangleButton>
                  <RectangleButton
                    type="button"
                    size="default"
                    variant={rejectVariant}
                    onClick={() => onDecide(needApproval.approvalId, "reject")}
                  >
                    Reject
                  </RectangleButton>
                </div>
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
