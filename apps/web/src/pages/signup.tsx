import { PageSignup } from "../components/pages/signup"
import { handleSsr } from "../middleware/ssr"

export default function SignUp() {
  return (
    <>
      <title>Sign Up</title>
      <PageSignup />
    </>
  )
}

export const getServerSideProps = handleSsr({ isPublicPage: true })
