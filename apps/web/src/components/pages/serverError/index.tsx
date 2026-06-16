import { L } from "../../../localization"

export const Page500 = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
      <div className="text-4xl font-bold">{L.errorPage.serverError}</div>
      <a href="/" className="text-link hover:text-link-hover text-lg underline transition-colors">
        {L.common.goBackToHome}
      </a>
    </div>
  )
}
