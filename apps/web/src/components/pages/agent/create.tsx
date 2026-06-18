import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { AiModelTier, AiModelTierList } from "@wr/shared"

import { useNotification } from "../../../contexts/notification"
import { useAgentCreate } from "../../../hooks/trpc/agent"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { RectangleButton } from "../../buttons/rectangleButton"
import { SelectForm } from "../../forms/selectForm"
import { TextAreaForm } from "../../forms/textAreaForm"
import { TextForm } from "../../forms/textForm"
import { BodyLayout } from "../../layout/body"
import { PageLayout } from "../../layout/page"
import { Section } from "../../section"

type FormData = {
  name: string
  tier: AiModelTier
  description?: string
  descriptionForAgent: string
  prompt: string
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

export interface PageAgentCreateProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PageAgentCreate = ({}: PageAgentCreateProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync, isPending } = useAgentCreate()

  return (
    <PageLayout>
      <BodyLayout title={"Create Agent"} description={L.account.description} containerClassName="gap-10">
        <Form<FormData>
          onSubmit={async (value) => {
            try {
              await mutateAsync(value)
              router.push(Route.agent())
              notify.info("Success", "Agent created successfully")
            } catch (e) {
              notify.error("Error", e.message)
            }
          }}
          initialValues={{
            tier: "medium",
          }}
          validate={validate}
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
                  Create Agent
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
