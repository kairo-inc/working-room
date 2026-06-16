import { AsyncLocalStorage } from "node:async_hooks"
import { DependencyContainer } from "tsyringe"

import { NoContextError, TokenData } from "@wr/shared"

import { decodeJwt } from "./jwt"

export interface PrivateRequestContext {
  idToken: string
}

export interface PrivateRequestContextResult {
  userId: string
  tenantId: string
  role: TokenData["role"]
}

export interface PublicRequestContext {}

export interface PublicRequestContextResult {}

export type DiContainerContext = DependencyContainer

type GlobalContextStorage = typeof globalThis & {
  __wrPrivateRequestContextStorage?: AsyncLocalStorage<PrivateRequestContext>
  __wrPublicRequestContextStorage?: AsyncLocalStorage<PublicRequestContext>
  __wrDiContainerContextStorage?: AsyncLocalStorage<DiContainerContext>
}

// Ensure the context storages are shared in a process, even if multiple modules import the context functions.
const globalContextStorage = globalThis as GlobalContextStorage

const privateStorage = (globalContextStorage.__wrPrivateRequestContextStorage ??= new AsyncLocalStorage<PrivateRequestContext>())

const publicStorage = (globalContextStorage.__wrPublicRequestContextStorage ??= new AsyncLocalStorage<PublicRequestContext>())

const diContainerStorage = (globalContextStorage.__wrDiContainerContextStorage ??= new AsyncLocalStorage<DiContainerContext>())

export async function runWithPrivateContext<T>(context: PrivateRequestContext, fn: () => Promise<T>): Promise<T> {
  return await privateStorage.run(context, fn)
}

export async function runWithPublicContext<T>(context: PublicRequestContext, fn: () => Promise<T>): Promise<T> {
  return await publicStorage.run(context, fn)
}

export function getPrivateContext(): PrivateRequestContextResult {
  const context = privateStorage.getStore()

  if (!context) {
    throw new NoContextError("No private request context found")
  }

  const { tenantId, userId, role } = decodeJwt(context.idToken)
  return { tenantId, userId, role }
}

export function getPublicContext(): PublicRequestContextResult {
  const context = publicStorage.getStore()

  if (!context) {
    throw new NoContextError("No public request context found")
  }

  return context
}

export function getDiContainerStore(): DiContainerContext | undefined {
  return diContainerStorage.getStore()
}

export async function runWithDiContainer<T>(container: DiContainerContext, fn: () => Promise<T>): Promise<T> {
  return await diContainerStorage.run(container, fn)
}
