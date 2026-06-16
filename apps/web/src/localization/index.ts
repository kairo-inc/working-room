import LocalizedStrings from "react-localization"

import en from "./en"
import ja from "./ja"

const strings = new LocalizedStrings<typeof en>({
  en,
  ja,
})

export { strings as L }
