import { getCurrentInstance, markRaw, type AppContext, type ComponentInternalInstance } from 'vue'

import type { CreateWindowOptions, WindowsItem } from '../types'

type WindowProvides = AppContext['provides']
type InstanceWithProvides = ComponentInternalInstance & {
  provides: WindowProvides
}

export interface WindowOwnerContext {
  appContext: AppContext | null
  provides: WindowProvides | null
}

export const windowOwnerContextKey: unique symbol = Symbol('vue3-windows-owner-context')

export type ContextualCreateWindowOptions = CreateWindowOptions & {
  [windowOwnerContextKey]?: WindowOwnerContext | null
}

export type ContextualWindowsItem = WindowsItem & {
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
  options: CreateWindowOptions,
  context: WindowOwnerContext | null | undefined,
): CreateWindowOptions {
  if (!context) {
    return options
  }

  return {
    ...options,
    [windowOwnerContextKey]: markRaw(context),
  } as ContextualCreateWindowOptions
}

export function getWindowOwnerContext(item: WindowsItem) {
  return (item as ContextualWindowsItem)[windowOwnerContextKey] ?? null
}

export function inheritWindowOwnerProvides(item: WindowsItem) {
  const instance = getCurrentInstance() as InstanceWithProvides | null
  const context = getWindowOwnerContext(item)

  if (instance && context?.provides) {
    instance.provides = Object.create(context.provides)
  }
}
