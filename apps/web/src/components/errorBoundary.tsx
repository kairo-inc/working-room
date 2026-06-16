import React from "react"

import { L } from "../localization"

type Props = { children: React.ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
          <div className="text-4xl font-bold">{L.errorPage.serverError}</div>
          <a href="/" className="text-link hover:text-link-hover text-lg underline transition-colors">
            {L.common.goBackToHome}
          </a>
        </div>
      )
    }
    return this.props.children
  }
}
