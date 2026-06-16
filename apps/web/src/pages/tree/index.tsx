import { PageTree, PageTreeProps } from "../../components/pages/tree"
import { handleSsr } from "../../middleware/ssr"
import { getWebAppDiContainer } from "../../server/container"
import { Resolver } from "../../server/resolver"

export default function Tree(props: PageTreeProps) {
  return (
    <>
      <title>/</title>
      <PageTree {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageTreeProps>({
  fn: async () => {
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const root = await service.getParentOrRoot({})
    const ancestorsPromise = service.getAncestors({ id: root.id })
    const fileListPromise = service.getFilesInFolder({ id: root.id })
    const [ancestors, fileList] = await Promise.all([ancestorsPromise, fileListPromise])
    return {
      props: {
        parent: root,
        ancestors,
        fileList,
      },
    }
  },
})
