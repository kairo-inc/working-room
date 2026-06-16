import Layout from "@theme/Layout"

import { FeaturesGrid } from "../components/Feature"
import { Hero } from "../components/Hero"
import { Info } from "../components/Info"
import Screenshot from "../components/Screenshot"

export default function Home() {
  return (
    <Layout>
      <Hero />
      <div className="bg-background flex items-center justify-center p-8">
        <Screenshot
          className="max-w-5xl rounded-lg 2xl:max-w-6xl"
          alt="screenshot"
          dark="/img/screenshots/screen_dark.png"
          light="/img/screenshots/screen_light.png"
        />
      </div>
      <FeaturesGrid />
      <Info />
    </Layout>
  )
}
