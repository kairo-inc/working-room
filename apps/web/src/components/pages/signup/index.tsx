import { Form } from "react-final-form"

import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { formStringRequired } from "../../../components/formSchema"
import { TextForm } from "../../../components/forms/textForm"
import { PaneLayout } from "../../../components/layout/pane"
import { Link } from "../../../components/link"
import { downloadFile } from "../../../components/utils/download"
import { useNotification } from "../../../contexts/notification"
import { useAuthSignup } from "../../../hooks/trpc/auth"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { LogoIcon } from "../../asset/logo"

type FormData = {
  email: string
}

const validate = (values: FormData) => {
  const error = {} as { email?: string }
  const emailCheck = formStringRequired({ maxLength: 128 }).safeParse(values.email ?? "")
  if (!emailCheck.success) {
    error.email = emailCheck.error.issues[0]?.message
  } else {
    const hasAtSign = values.email?.includes("@")
    const hasDotAfterAtSign = values.email?.split("@")[1]?.includes(".")
    const notEndWithDot = values.email?.endsWith(".") === false
    const hasSpaces = values.email?.includes(" ")
    if (!hasAtSign || !hasDotAfterAtSign || !notEndWithDot || hasSpaces) {
      error.email = L.common.validation.invalidEmail
    }
  }
  return error
}

export interface PageSignupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PageSignup = (_: PageSignupProps) => {
  const notify = useNotification()
  const { mutateAsync: signup } = useAuthSignup()
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <div className="mb-4 flex items-center gap-2 text-3xl font-bold">
        <LogoIcon size={32} /> {L.signup.appName}
      </div>
      <PaneLayout>
        <div className="mb-6">
          <h1 className="text-primary text-2xl font-bold">{L.signup.title}</h1>
        </div>
        <Form<FormData>
          onSubmit={async ({ email }) => {
            try {
              const result = await signup({ email, token: "test" })
              if (result.localAuthProps) {
                downloadFile(
                  "credentials.txt",
                  `Email: ${result.localAuthProps.email}\nInitial Password: ${result.localAuthProps.initialPassword}\n\nPlease change your password after signing in.`
                )
                notify.info(L.signup.successTitle, L.signup.successCredentials)
              } else {
                notify.info(L.signup.successTitle, L.signup.successEmail)
              }
            } catch (e) {
              notify.error(L.signup.failed, e.message)
            }
          }}
          validate={validate}
          render={({ handleSubmit, hasValidationErrors, submitting }) => (
            <form onSubmit={handleSubmit} className="flex min-w-68 flex-col gap-2">
              <TextForm formName="email" label={L.signup.emailLabel} placeholder={L.signup.emailPlaceholder} autoComplete="email" />
              <div>
                <RectangleButton type="submit" className="mt-3 w-full" disabled={hasValidationErrors} loading={submitting}>
                  {L.signup.submit}
                </RectangleButton>
              </div>
            </form>
          )}
        />
      </PaneLayout>
      <Link href={Route.signin()}>{L.signup.alreadyHaveAccount}</Link>
    </div>
  )
}
