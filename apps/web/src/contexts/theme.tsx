// Disable SSR for next-themes because it raises hydration error due to mismatch between server and client theme
// See https://github.com/shadcn-ui/ui/issues/5552
import { ThemeProviderProps } from "next-themes"
import dynamic from "next/dynamic"

const NextThemesProvider = dynamic(() => import("next-themes").then((e) => e.ThemeProvider), {
  ssr: false,
})

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
