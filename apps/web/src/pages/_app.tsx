// Initialize dayjs.
import { SessionProvider } from "next-auth/react"
import type { AppProps } from "next/app"
import "reflect-metadata"

import { ErrorBoundary } from "../components/errorBoundary"
import { NotificationProvider } from "../contexts/notification"
import { SettingProvider } from "../contexts/setting"
import { ThemeProvider } from "../contexts/theme"
import "../styles/globals.css"
import { AppUserSetting } from "../types/user"
import "../utils/day"
import { trpc } from "../utils/trpc"

function App({ Component, pageProps }: AppProps) {
  const setting = pageProps.setting as AppUserSetting | undefined
  if (setting) {
    // NOTE: Private pages get the setting prop from SSR, so we can safely assume it's always available.
    // However, for public pages, the setting prop is not provided, so we need to handle the case when it's undefined.
    return (
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider session={pageProps.session}>
            <SettingProvider setting={setting}>
              <NotificationProvider>
                <Component {...pageProps} />
              </NotificationProvider>
            </SettingProvider>
          </SessionProvider>
        </ThemeProvider>
      </ErrorBoundary>
    )
  } else {
    return (
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider session={pageProps.session}>
            <NotificationProvider>
              <Component {...pageProps} />
            </NotificationProvider>
          </SessionProvider>
        </ThemeProvider>
      </ErrorBoundary>
    )
  }
}

export default trpc.withTRPC(App)
