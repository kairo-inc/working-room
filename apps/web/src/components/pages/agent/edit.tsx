import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { AiModelTier, AiModelTierList } from "@wr/shared"

import { useNotification } from "../../../contexts/notification"
import { useAgentEdit } from "../../../hooks/trpc/agent"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppAgent } from "../../../types/agent"
import { RectangleButton } from "../../buttons/rectangleButton"
import { SelectForm } from "../../forms/selectForm"
import { TextAreaForm } from "../../forms/textAreaForm"
import { TextForm } from "../../forms/textForm"
import { BodyLayout } from "../../layout/body"
import { PageLayout } from "../../layout/page"
import { Section } from "../../section"

type FormData = {
  name?: string
  tier?: AiModelTier
  description?: string | null
  descriptionForAgent?: string
  prompt?: string
}

const validate = (values: FormData) => {
  const errors: Partial<Record<keyof FormData, string>> = {}
  if (!values.name) {
    errors.name = "Group name is required"
  } else if (values.name.length > 50) {
    errors.name = "Group name must be less than 50 characters"
  }

  if (!values.descriptionForAgent) {
    errors.descriptionForAgent = "Description for agent is required"
  }

  if (!values.prompt) {
    errors.prompt = "System prompt is required"
  }

  if (!values.tier) {
    errors.tier = "Model tier is required"
  } else if (!AiModelTierList.includes(values.tier)) {
    errors.tier = "Invalid model tier"
  }

  if (values.description && values.description.length > 200) {
    errors.description = "Description must be less than 200 characters"
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

  return (
    <PageLayout>
      <BodyLayout title={"Edit Agent"} description={L.account.description} containerClassName="gap-10">
        <Form<FormData>
          validate={validate}
          initialValues={data}
          onSubmit={async (value) => {
            try {
              const { description, ...rest } = value
              await mutateAsync({ ...rest, description: description?.trim() ?? null, id: data.id })
              router.replace(Route.agent(data.id))
              notify.info("Success", "Agent updated successfully")
            } catch (e) {
              notify.error("Error", e.message)
            }
          }}
          render={({ handleSubmit, hasValidationErrors }) => (
            <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit}>
              <Section title="Agent Descriptions" containerClassName="flex flex-col items-start gap-2">
                <div className="flex w-full flex-col gap-4 md:flex-row">
                  <TextForm formName="name" label="Name" placeholder="e.g. Company rule agent" />
                  <SelectForm
                    formName="tier"
                    label="Model Tier"
                    options={AiModelTierList.map((tier) => ({
                      label: tier,
                      value: tier,
                    }))}
                  />
                </div>
                <TextAreaForm
                  formName="description"
                  label="Description"
                  placeholder="e.g. An agent that helps manage company rules"
                  rows={4}
                />
              </Section>
              <Section title="Prompt" containerClassName="flex flex-col gap-2">
                <TextAreaForm
                  formName="descriptionForAgent"
                  label="Description for Agent"
                  rows={14}
                  placeholder={`e.g. An agent that helps manage company rules`}
                />
                <TextAreaForm formName="prompt" label="System prompt" rows={14} placeholder={`e.g. Generate a summary of company rules`} />
              </Section>
              <div className="flex w-full justify-end gap-4">
                <RectangleButton type="submit" disabled={hasValidationErrors} loading={isPending}>
                  Save
                </RectangleButton>
                <RectangleButton variant="defaultOutline" disabled={isPending} onClick={() => router.push(Route.agent())}>
                  Cancel
                </RectangleButton>
              </div>
            </form>
          )}
        />
      </BodyLayout>
    </PageLayout>
  )
}
