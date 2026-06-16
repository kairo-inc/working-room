import { UserRole } from "@wr/db"
import { PermissionDeniedError } from "@wr/shared"
import { getPrivateContext } from "@wr/shared-node"

// An decorator to check session context.
type RestrictRule = {
  onlyAccept?: UserRole[]
}
export function guard(rule: RestrictRule) {
  const { onlyAccept: onlyRoles } = rule
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const f = descriptor.value as (...args: unknown[]) => Promise<unknown>
    descriptor.value = function (...args: Parameters<typeof f>) {
      return new Promise((resolve, reject) => {
        const ctx = getPrivateContext()
        if (!ctx) {
          reject(new PermissionDeniedError(`No context given. Need to pass a private context for using guard.`))
          return
        }
        const { role } = ctx
        if (onlyRoles && !onlyRoles.includes(role)) {
          reject(new PermissionDeniedError(`This operation is not permitted to user ${role}.`))
          return
        }
        resolve(f.apply(this, args))
      })
    }
  }
}
