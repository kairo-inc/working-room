import { PageTree, PageTreeProps } from "../../../components/pages/tree"
import { handleSsr } from "../../../middleware/ssr"
import { getWebAppDiContainer } from "../../../server/container"
import { Resolver } from "../../../server/resolver"
import { ensureQuery } from "../../../utils/queryParser"

export default function Tree(props: PageTreeProps) {
  return (
    <>
      <title>/{props.parent.name}</title>
      <PageTree {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageTreeProps>({
  fn: async (ctx) => {
    const parentFileId = ensureQuery(ctx, "descId")
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const parent = await service.getParentOrRoot({ id: parentFileId })
    const ancestorsPromise = service.getAncestors({ id: parent.id })
    const fileListPromise = service.getFilesInFolder({ id: parent.id })
    const [ancestors, fileList] = await Promise.all([ancestorsPromise, fileListPromise])
    return {
      props: {
        parent,
        ancestors,
        fileList,
      },
    }
  },
})
