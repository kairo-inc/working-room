import { PageAccount, PageAccountProps } from "../components/pages/account"
import { handleSsr } from "../middleware/ssr"
import { getWebAppDiContainer } from "../server/container"
import { UserService } from "../server/services/userType"

export default function Account({ ...props }: PageAccountProps) {
  return (
    <>
      <title>Account</title>
      <PageAccount {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageAccountProps>({
  fn: async () => {
    const service = getWebAppDiContainer().resolve<UserService>("UserService")
    const data = await service.getMySetting()
    return { props: { data } }
  },
})
