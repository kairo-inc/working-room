import { useTheme } from "next-themes"
import { Head, Html, Main, NextScript } from "next/document"

export default function Document() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg" style={{ color: isDark ? "black" : "white" }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
