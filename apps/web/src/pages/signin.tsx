import { PageSignin } from "../components/pages/signin"
import { handleSsr } from "../middleware/ssr"

export default function SignIn() {
  return (
    <>
      <title>Sign In</title>
      <PageSignin />
    </>
  )
}

export const getServerSideProps = handleSsr({ isPublicPage: true })
