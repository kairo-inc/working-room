import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { AiModelTier, AiModelTierList } from "@wr/shared"

import { useNotification } from "../../../contexts/notification"
import { useAgentCreate } from "../../../hooks/trpc/agent"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppFileDescriptor } from "../../../types/file"
import { RectangleButton } from "../../buttons/rectangleButton"
import { DummyForm } from "../../forms/dummyForm"
import { SelectForm } from "../../forms/selectForm"
import { TextAreaForm } from "../../forms/textAreaForm"
import { TextForm } from "../../forms/textForm"
import { BodyLayout } from "../../layout/body"
import { PageLayout } from "../../layout/page"
import { useFileSelectModal } from "../../modals/fileSelect"
import { Section } from "../../section"

type FormData = {
  name: string
  tier: AiModelTier
  description?: string
  descriptionForAgent: string
  prompt: string
  workingFolder?: AppFileDescriptor
}

const validate = (values: FormData) => {
  const errors: Partial<Record<keyof FormData, string>> = {}
  if (!values.name) {
    errors.name = L.agent.create.validation.nameRequired
  } else if (values.name.length > 50) {
    errors.name = L.agent.create.validation.nameMaxLength
  }

  if (!values.descriptionForAgent) {
    errors.descriptionForAgent = L.agent.create.validation.descriptionForAgentRequired
  }

  if (!values.prompt) {
    errors.prompt = L.agent.create.validation.promptRequired
  }

  if (!values.tier) {
    errors.tier = L.agent.create.validation.tierRequired
  } else if (!AiModelTierList.includes(values.tier)) {
    errors.tier = L.agent.create.validation.tierInvalid
  }

  if (values.description && values.description.length > 200) {
    errors.description = L.agent.create.validation.descriptionMaxLength
  }

  return errors
}

export interface PageAgentCreateProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PageAgentCreate = ({}: PageAgentCreateProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync, isPending } = useAgentCreate()
  const { show: showFileSelectModal, modal: FileSelectModal } = useFileSelectModal()
  return (
    <PageLayout>
      <BodyLayout title={L.agent.create.title} description={L.agent.create.description} containerClassName="gap-10">
        <Form<FormData>
          onSubmit={async (value) => {
            try {
              const { workingFolder, ...rest } = value
              await mutateAsync({ ...rest, workingFolderId: workingFolder?.id })
              router.push(Route.agent())
              notify.info(L.agent.create.success, L.agent.create.created)
            } catch (e) {
              notify.error(L.common.error, e.message)
            }
          }}
          initialValues={{
            tier: "medium",
          }}
          validate={validate}
          render={({ handleSubmit, hasValidationErrors, form: { change } }) => (
            <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit}>
              <Section title={L.agent.create.sectionDescriptions} containerClassName="flex flex-col gap-2">
                <div className="flex w-full gap-4">
                  <div className="flex-1">
                    <TextForm formName="name" label={L.agent.create.fields.name} placeholder={L.agent.create.fields.namePlaceholder} />
                  </div>
                  <div className="flex-1"></div>
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
                    onRemove={() => change("workingFolder", undefined)}
                    onClick={() => {
                      showFileSelectModal({
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
                  {L.agent.create.title}
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
