import { useRouter } from "next/router"
import { useState } from "react"

import { FileList } from "../../../components/file/list"
import { FileUploadPane } from "../../../components/file/upload"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { useNotification } from "../../../contexts/notification"
import { useFileGetList, useFileUploadFiles } from "../../../hooks/trpc/file"
import { L } from "../../../localization"
import { AppFileDescriptor } from "../../../types/file"

export interface PageTreeProps extends React.HTMLAttributes<HTMLDivElement> {
  parent: AppFileDescriptor
  ancestors: AppFileDescriptor[]
}

export const PageTree = ({ parent, ancestors }: PageTreeProps) => {
  const router = useRouter()
  const notify = useNotification()
  const [queryArgs, setQueryArgs] = useState<Parameters<typeof useFileGetList>[0]>({ parentId: parent.id })

  const { data, isPending } = useFileGetList(queryArgs)
  const { mutateAsync: upload } = useFileUploadFiles()

  const fileList = data?.pages.flatMap((page) => page.data) ?? []

  const folderPath = `/ ${ancestors
    .slice(1) // Skip the root folder.
    .map((desc) => desc.name)
    .join(" / ")}`

  const onFileUpload = async (files: File[]) => {
    try {
      const formData = new FormData()

      formData.append("parentId", parent.id)
      files.forEach((file) => formData.append("files", file))

      await upload(formData)

      notify.info(L.tree.uploadTitle, L.tree.uploadSuccess)
      router.replace(router.asPath)
    } catch (e) {
      notify.error(L.tree.uploadTitle, e.message)
    }
  }

  return (
    <PageLayout key={parent.id}>
      <BodyLayout title={folderPath} description={L.tree.description} className="context-menu max-w-5xl">
        <FileList data={fileList} parent={parent} isPending={isPending} />
      </BodyLayout>
      <FileUploadPane onFileUpload={onFileUpload} />
    </PageLayout>
  )
}
