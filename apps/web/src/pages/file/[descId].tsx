import { PageFile, PageFileProps } from "../../components/pages/file"
import { handleSsr } from "../../middleware/ssr"
import { getWebAppDiContainer } from "../../server/container"
import { Resolver } from "../../server/resolver"
import { ensureQuery } from "../../utils/queryParser"

export default function File(props: PageFileProps) {
  return (
    <>
      <PageFile {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageFileProps>({
  fn: async (ctx) => {
    const descId = ensureQuery(ctx, "descId")
    const resolver = getWebAppDiContainer().resolve<Resolver>("Resolver")
    const service = await resolver.resolveFileService()
    const data = await service.get({ id: descId })
    return {
      props: {
        data,
      },
    }
  },
})
