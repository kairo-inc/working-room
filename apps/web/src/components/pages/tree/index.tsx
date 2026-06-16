import { useRouter } from "next/router"

import { PageResult } from "@wr/shared"

import { FileList } from "../../../components/file/list"
import { FileUploadPane } from "../../../components/file/upload"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { useNotification } from "../../../contexts/notification"
import { useFileUploadFiles } from "../../../hooks/trpc/file"
import { L } from "../../../localization"
import { AppFileDescriptor } from "../../../types/file"

export interface PageTreeProps extends React.HTMLAttributes<HTMLDivElement> {
  parent: AppFileDescriptor
  ancestors: AppFileDescriptor[]
  fileList: PageResult<AppFileDescriptor>
}

export const PageTree = ({ parent, ancestors, fileList }: PageTreeProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: upload } = useFileUploadFiles()

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
    } catch (_) {
      notify.error(L.tree.uploadTitle, L.tree.uploadFailed)
    }
  }

  return (
    <PageLayout key={parent.id}>
      <BodyLayout title={folderPath} description={L.tree.description} className="context-menu max-w-5xl">
        <FileList data={fileList} parent={parent} />
      </BodyLayout>
      <FileUploadPane onFileUpload={onFileUpload} />
    </PageLayout>
  )
}
