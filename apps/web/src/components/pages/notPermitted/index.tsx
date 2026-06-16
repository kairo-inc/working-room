import { L } from "../../../localization"

export const Page403 = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
      <div className="text-4xl font-bold">{L.errorPage.forbidden}</div>
      <a href="/" className="text-link hover:text-link-hover text-lg underline transition-colors">
        {L.common.goBackToHome}
      </a>
    </div>
  )
}
