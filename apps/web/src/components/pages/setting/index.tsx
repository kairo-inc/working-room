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
import { HorizontalAlignedItems } from "../../layout/horizontalAlignedItems"
import { VerticalAlignedItems } from "../../layout/verticalAlignedItems"
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
          <VerticalAlignedItems items={[{ label: L.setting.organization.name, value: data.name }]} />
        </Section>
        <Section title={L.setting.userManagement.title}>
          <RectangleButton href={Route.settingUserList()}>{L.setting.userManagement.goToList}</RectangleButton>
        </Section>
        <Section title={L.setting.accessGroup.title}>
          <RectangleButton href={Route.settingAccessGroup()}>{L.setting.accessGroup.goToList}</RectangleButton>
        </Section>
        <Section title={L.setting.agentSettings.title}>
          <HorizontalAlignedItems
            header={[L.setting.agentSettings.name, L.setting.agentSettings.description]}
            items={[
              { values: [L.setting.agentSettings.coordinator.name, L.setting.agentSettings.coordinator.description] },
              { values: [L.setting.agentSettings.heavy.name, L.setting.agentSettings.heavy.description] },
            ]}
          />
        </Section>
        <Section title={L.setting.tokenUsage.title}>
          <TokenUsageTable data={tokenUsage} />
        </Section>
      </BodyLayout>
      {TenantEditModal}
    </PageLayout>
  )
}
