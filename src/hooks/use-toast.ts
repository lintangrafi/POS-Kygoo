import * as React from "react"

export type ToastProps = {
  id?: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export type ToastActionElement = React.ReactElement

export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const toast = ({ title, description, variant = "default" }: ToastProps) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { title, description, variant, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
    
    return id
  }

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return {
    toast,
    dismiss,
    toasts
  }
}