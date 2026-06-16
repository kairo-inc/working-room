import { Edit } from "lucide-react"

import { IconButton } from "../../../components/buttons/iconButton"
import { RectangleButton } from "../../../components/buttons/rectangleButton"
import { BodyLayout } from "../../../components/layout/body"
import { PageLayout } from "../../../components/layout/page"
import { useTenantEditModal } from "../../../components/modals/tenantEdit"
import { Section } from "../../../components/section"
import { L } from "../../../localization"
import { Route } from "../../../route"
import { AppTenant } from "../../../types/tenant"
import { AppTokenUsageOnTenant } from "../../../types/tokenUsage"
import { TokenUsageTable } from "./tokenUsage"

export interface PageSettingProps extends React.HTMLAttributes<HTMLDivElement> {
  data: AppTenant
  tokenUsage: AppTokenUsageOnTenant[]
}

export const PageSetting = ({ data, tokenUsage }: PageSettingProps) => {
  const { show: showTenantEditModal, modal: TenantEditModal } = useTenantEditModal()
  const editButton = (
    <IconButton size="default" icon={<Edit />} onClick={() => showTenantEditModal({ data: { id: data.id, name: data.name } })} />
  )

  return (
    <PageLayout>
      <BodyLayout title={L.setting.title} description={L.setting.description} containerClassName="gap-10">
        <Section title={L.setting.organization.title} tail={editButton}>
          <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-4 text-base">
            <div className="font-bold">{L.setting.organization.name}</div>
            <div>{data.name}</div>
          </div>
        </Section>
        <Section title={L.setting.userManagement.title}>
          <RectangleButton href={Route.settingUserList()}>{L.setting.userManagement.goToList}</RectangleButton>
        </Section>
        <Section title={L.setting.accessGroup.title}>
          <RectangleButton href={Route.settingAccessGroup()}>{L.setting.accessGroup.goToList}</RectangleButton>
        </Section>
        <Section title={L.setting.agentSettings.title}>
          <div className="grid grid-cols-[auto_1fr] gap-2 gap-x-4 text-base">
            <div className="font-bold">{L.setting.agentSettings.name}</div>
            <div className="font-bold">{L.setting.agentSettings.description}</div>
            <div>{L.setting.agentSettings.coordinator.name}</div>
            <div>{L.setting.agentSettings.coordinator.description}</div>
            <div>{L.setting.agentSettings.heavy.name}</div>
            <div>{L.setting.agentSettings.heavy.description}</div>
          </div>
        </Section>
        <Section title={L.setting.tokenUsage.title}>
          <TokenUsageTable data={tokenUsage} />
        </Section>
      </BodyLayout>
      {TenantEditModal}
    </PageLayout>
  )
}
