import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { PasswordInitializationRequired, isErrorEqual } from "@wr/shared"

import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { formStringRequired } from "../../../components/formSchema"
import { TextForm } from "../../../components/forms/textForm"
import { PaneLayout } from "../../../components/layout/pane"
import { Link } from "../../../components/link"
import { useInitializePasswordModal } from "../../../components/modals/initializePassword"
import { useNotification } from "../../../contexts/notification"
import { useAuthSigninByEmail } from "../../../hooks/api/auth"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { LogoIcon } from "../../asset/logo"

type FormData = {
  email: string
  password: string
}

const validate = (values: FormData) => {
  const error = {} as { email?: string; password?: string }

  const emailCheck = formStringRequired().safeParse(values.email ?? "")
  if (!emailCheck.success) {
    error.email = emailCheck.error.issues[0]?.message
  }
  const passwordCheck = formStringRequired().safeParse(values.password ?? "")
  if (!passwordCheck.success) {
    error.password = passwordCheck.error.issues[0]?.message
  }
  return error
}

export interface PageSigninProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PageSignin = (_: PageSigninProps) => {
  const notify = useNotification()
  const router = useRouter()
  const { mutateAsync: signinByEmail } = useAuthSigninByEmail()
  const { show: showInitializePasswordModal, modal: InitializePasswordModal } = useInitializePasswordModal()
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4">
      <div className="mb-4 flex items-center gap-2 text-3xl font-bold">
        <LogoIcon size={32} /> {L.signin.appName}
      </div>
      <PaneLayout>
        <div className="mb-6">
          <h1 className="text-primary text-2xl font-bold">{L.signin.title}</h1>
        </div>
        <Form<FormData>
          onSubmit={async ({ email, password }) => {
            try {
              await signinByEmail({ email, password })
              router.reload()
            } catch (e) {
              if (isErrorEqual(e, PasswordInitializationRequired)) {
                showInitializePasswordModal({ sessionCode: e.message, email })
              } else {
                notify.error(L.signin.failed, e.message)
              }
            }
          }}
          validate={validate}
          render={({ handleSubmit, hasValidationErrors, submitting }) => (
            <form onSubmit={handleSubmit} className="flex min-w-68 flex-col gap-2">
              <TextForm formName="email" label={L.signin.emailLabel} placeholder={L.signin.emailPlaceholder} autoComplete="email" />
              <TextForm
                formName="password"
                label={L.signin.passwordLabel}
                placeholder={L.signin.passwordPlaceholder}
                type="password"
                autoComplete="current-password"
              />
              <div>
                <RectangleButton type="submit" className="mt-3 w-full" disabled={hasValidationErrors} loading={submitting}>
                  {L.signin.submit}
                </RectangleButton>
              </div>
            </form>
          )}
        />
      </PaneLayout>
      <Link href={Route.signup()}>{L.signin.noAccount}</Link>
      {InitializePasswordModal}
    </div>
  )
}
