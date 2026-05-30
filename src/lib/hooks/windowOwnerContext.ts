import { getCurrentInstance, markRaw, type AppContext, type ComponentInternalInstance } from 'vue'

import type { WindowOptions, WindowRecord } from '../types'

type WindowProvides = AppContext['provides']
type InstanceWithProvides = ComponentInternalInstance & {
  provides: WindowProvides
}

export interface WindowOwnerContext {
  appContext: AppContext | null
  provides: WindowProvides | null
}

export const windowOwnerContextKey: unique symbol = Symbol('vue3-windows-owner-context')

export type ContextualWindowOptions = WindowOptions & {
  [windowOwnerContextKey]?: WindowOwnerContext | null
}

export type ContextualWindowRecord = WindowRecord & {
  [windowOwnerContextKey]?: WindowOwnerContext | null
}

export function captureWindowOwnerContext(
  instance: ComponentInternalInstance | null = getCurrentInstance(),
): WindowOwnerContext | null {
  if (!instance) {
    return null
  }

  const instanceWithProvides = instance as InstanceWithProvides

  return {
    appContext: instance.appContext,
    provides: instanceWithProvides.provides,
  }
}

export function createAppContextWithOwnerContext(context: WindowOwnerContext | null | undefined) {
  if (!context?.appContext) {
    return null
  }

  if (!context.provides) {
    return context.appContext
  }

  return {
    ...context.appContext,
    provides: context.provides,
  }
}

export function withWindowOwnerContext(
  options: WindowOptions,
  context: WindowOwnerContext | null | undefined,
): WindowOptions {
  if (!context) {
    return options
  }

  return {
    ...options,
    [windowOwnerContextKey]: markRaw(context),
  } as ContextualWindowOptions
}

export function getWindowOwnerContext(windowRecord: WindowRecord) {
  return (windowRecord as ContextualWindowRecord)[windowOwnerContextKey] ?? null
}

export function inheritWindowOwnerProvides(windowRecord: WindowRecord) {
  const instance = getCurrentInstance() as InstanceWithProvides | null
  const context = getWindowOwnerContext(windowRecord)

  if (instance && context?.provides) {
    instance.provides = Object.create(context.provides)
  }
}
