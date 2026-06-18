import { useRouter } from "next/router"
import { Form } from "react-final-form"

import { AiModelTier, AiModelTierList } from "@wr/shared"

import { useNotification } from "../../contexts/notification"
import { useAgentCreate } from "../../hooks/trpc/agent"
import { L } from "../../localization"
import { RectangleButton } from "../buttons/rectangleButton"
import { SelectForm } from "../forms/selectForm"
import { TextAreaForm } from "../forms/textAreaForm"
import { TextForm } from "../forms/textForm"
import { Section } from "../section"
import { Modal, ModalBaseArgs, ModalProps, useModal } from "./modal"

type FormData = {
  name: string
  description?: string
  descriptionForAgent: string
  prompt: string
  tier: AiModelTier
}

type Args = ModalBaseArgs & {}

type AgentCreateModalProps = ModalProps & Args

const validate = (values: FormData) => {
  const errors: Partial<Record<keyof FormData, string>> = {}
  if (!values.name) {
    errors.name = "Group name is required"
  } else if (values.name.length > 50) {
    errors.name = "Group name must be less than 50 characters"
  }
  return errors
}

export const AgentCreateModal = ({ show, onClose, onReject, onResolve }: AgentCreateModalProps) => {
  const router = useRouter()
  const notify = useNotification()
  const { mutateAsync: createAgent, isPending } = useAgentCreate()
  return (
    <Modal show={show} onClose={onClose} title={"Agent Creation"} containerClassName="!max-w-[max(80vw,800px)] !w-[max(80vw,800px)]">
      <Form<FormData>
        validate={validate}
        onSubmit={async (values) => {
          try {
            // const agent = await createAgent({
            //   name: values.name,
            //   description: values.description,
            //   read: true,
            //   write: true,
            // })
            notify.info(L.modal.accessGroupCreate.success, L.modal.accessGroupCreate.successMessage.replace("{0}", values.name))
            onClose?.()
            router.replace(router.asPath)
            onResolve?.()
          } catch (e) {
            notify.error(L.modal.accessGroupCreate.failed, e.message)
          }
        }}
        render={({ handleSubmit, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="mt-4 flex w-full flex-col text-sm">
            <div className="text-muted-foreground mb-6">{L.modal.accessGroupCreate.permissionNote}</div>
            <div className="flex w-full gap-6">
              <Section containerClassName="flex flex-col gap-4 !p-0" title="Agent description">
                <TextForm
                  formName="name"
                  label={L.modal.accessGroupCreate.groupName}
                  placeholder={L.modal.accessGroupCreate.groupNamePlaceholder}
                  required
                />
                <TextAreaForm
                  formName="description"
                  label={L.modal.accessGroupCreate.descriptionLabel}
                  placeholder={L.modal.accessGroupCreate.descriptionPlaceholder}
                />
              </Section>
              <div className="bg-border h-xl w-px" />
              <Section containerClassName="flex flex-col gap-4 !p-0" title="Agent settings">
                <SelectForm formName="tier" options={AiModelTierList.map((tier) => ({ label: tier, value: tier }))} label="Tier" required />
                <TextAreaForm
                  formName="descriptionForAgent"
                  label={L.modal.accessGroupCreate.descriptionLabel}
                  placeholder={L.modal.accessGroupCreate.descriptionPlaceholder}
                />
                <TextAreaForm
                  formName="prompt"
                  label={L.modal.accessGroupCreate.descriptionLabel}
                  placeholder={L.modal.accessGroupCreate.descriptionPlaceholder}
                />
              </Section>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <RectangleButton type="submit" loading={isPending} disabled={hasValidationErrors}>
                {L.common.ok}
              </RectangleButton>
              <RectangleButton variant="defaultOutline" onClick={onClose} disabled={isPending}>
                {L.common.cancel}
              </RectangleButton>
            </div>
          </form>
        )}
      />
    </Modal>
  )
}

export const useAgentCreateModal = () => {
  return useModal<Args>(AgentCreateModal)
}
