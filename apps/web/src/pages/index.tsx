import { PageHome, PageHomeProps } from "../components/pages/home"
import { handleSsr } from "../middleware/ssr"

export default function Home({ ...props }: PageHomeProps) {
  return (
    <>
      <title>WorkingRoom</title>
      <PageHome {...props} />
    </>
  )
}

export const getServerSideProps = handleSsr<PageHomeProps>()
