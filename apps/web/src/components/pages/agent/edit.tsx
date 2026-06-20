import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { AiModelTier, AiModelTierList, MimeType } from "@wr/shared"

import { useNotification } from "../../../contexts/notification"
import { useAgentEdit } from "../../../hooks/trpc/agent"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppAgent } from "../../../types/agent"
import { RectangleButton } from "../../buttons/rectangleButton"
import { formStringRequired } from "../../formSchema"
import { DummyForm } from "../../forms/dummyForm"
import { SelectForm } from "../../forms/selectForm"
import { TextAreaForm } from "../../forms/textAreaForm"
import { TextForm } from "../../forms/textForm"
import { BodyLayout } from "../../layout/body"
import { PageLayout } from "../../layout/page"
import { useFileSelectModal } from "../../modals/fileSelect"
import { Section } from "../../section"

type FormData = {
  name?: string
  tier?: AiModelTier
  description?: string | null
  descriptionForAgent?: string
  prompt?: string
  workingFolder?: { id: string; name: string; mimeType: MimeType } | null
}

const validate = (values: FormData) => {
  const errors: Partial<Record<keyof FormData, string>> = {}

  const nameCheck = formStringRequired({ maxLength: 128 }).safeParse(values.name ?? "")
  if (!nameCheck.success) errors.name = nameCheck.error.issues[0]?.message

  const descriptionForAgentCheck = formStringRequired({ maxLength: 2048 }).safeParse(values.descriptionForAgent ?? "")
  if (!descriptionForAgentCheck.success) errors.descriptionForAgent = descriptionForAgentCheck.error.issues[0]?.message

  const promptCheck = formStringRequired({ maxLength: 8192 }).safeParse(values.prompt ?? "")
  if (!promptCheck.success) errors.prompt = promptCheck.error.issues[0]?.message

  if (!values.tier) {
    errors.tier = L.agent.create.validation.tierRequired
  } else if (!AiModelTierList.includes(values.tier)) {
    errors.tier = L.agent.create.validation.tierInvalid
  }

  if (values.description && values.description.length > 1024) {
    errors.description = L.common.validation.maxLength
  }

  return errors
}

export interface PageAgentEditProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppAgent
}

export const PageAgentEdit = ({ data }: PageAgentEditProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync, isPending } = useAgentEdit()
  const { show: showFileSelectModal, modal: FileSelectModal } = useFileSelectModal()

  return (
    <PageLayout>
      <BodyLayout title={L.agent.edit.title} description={L.agent.edit.description} containerClassName="gap-10">
        <Form<FormData>
          validate={validate}
          initialValues={data}
          onSubmit={async (value) => {
            try {
              const { workingFolder, description, ...rest } = value
              await mutateAsync({
                ...rest,
                description: description?.trim() ?? null,
                workingFolderId: workingFolder === undefined ? undefined : (workingFolder?.id ?? null),
                id: data.id,
              })
              router.replace(Route.agent(data.id))
              notify.info(L.agent.create.success, L.agent.edit.updated)
            } catch (e) {
              notify.error(L.common.error, e.message)
            }
          }}
          render={({ handleSubmit, hasValidationErrors, form: { change } }) => (
            <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit}>
              <Section title={L.agent.create.sectionDescriptions} containerClassName="flex flex-col items-start gap-2">
                <div className="flex w-full gap-4">
                  <div className="flex-1">
                    <TextForm formName="name" label={L.agent.create.fields.name} placeholder={L.agent.create.fields.namePlaceholder} />
                  </div>
                  <div className="flex-1" />
                </div>
                <div className="flex w-full flex-col gap-4 md:flex-row">
                  <SelectForm
                    formName="tier"
                    label={L.agent.create.fields.tier}
                    options={AiModelTierList.map((tier) => ({
                      label: tier,
                      value: tier,
                    }))}
                  />
                  <DummyForm
                    formName="workingFolder"
                    label={L.agent.create.fields.workingFolder}
                    placeholder={L.agent.create.fields.workingFolderPlaceholder}
                    toString={(value) => value.name}
                    onRemove={() => change("workingFolder", null)}
                    onClick={() => {
                      showFileSelectModal({
                        initialParentFolderId: data.workingFolder?.parentId,
                        onFileSelected: (file) => {
                          change("workingFolder", file)
                        },
                      })
                    }}
                  />
                </div>
                <TextAreaForm
                  formName="description"
                  label={L.agent.create.fields.description}
                  placeholder={L.agent.create.fields.descriptionPlaceholder}
                  rows={4}
                />
              </Section>
              <Section title={L.agent.create.sectionPrompt} containerClassName="flex flex-col gap-2">
                <TextAreaForm
                  formName="descriptionForAgent"
                  label={L.agent.create.fields.descriptionForAgent}
                  rows={14}
                  placeholder={L.agent.create.fields.descriptionForAgentPlaceholder}
                />
                <TextAreaForm
                  formName="prompt"
                  label={L.agent.create.fields.prompt}
                  rows={14}
                  placeholder={L.agent.create.fields.promptPlaceholder}
                />
              </Section>
              <div className="flex w-full justify-end gap-4">
                <RectangleButton type="submit" disabled={hasValidationErrors} loading={isPending}>
                  {L.agent.edit.save}
                </RectangleButton>
                <RectangleButton variant="defaultOutline" disabled={isPending} onClick={() => router.push(Route.agent())}>
                  {L.common.cancel}
                </RectangleButton>
              </div>
            </form>
          )}
        />
      </BodyLayout>
      {FileSelectModal}
    </PageLayout>
  )
}
