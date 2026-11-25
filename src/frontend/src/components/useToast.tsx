import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error'
export type Notify = (kind: ToastKind, message: string) => void

export const ToastContext = createContext<Notify | null>(null)

export function useToast(): Notify {
  const notify = useContext(ToastContext)

  if (!notify) {
    throw new Error('useToast turi būti naudojamas ToastProvider viduje.')
  }

  return notify
}