import { toast, type ExternalToast } from 'sonner'

interface ToastOptions {
  description?: string
  duration?: number
}

export function useToast() {
  return {
    success: (message: string, options?: ToastOptions) =>
      toast.success(message, {
        ...options,
        style: {
          background: '#e6f7f4',
          border: '1px solid #00b894',
          color: '#1f2937',
        },
      } as ExternalToast),

    error: (message: string, options?: ToastOptions) =>
      toast.error(message, {
        ...options,
        style: {
          background: '#fef2f2',
          border: '1px solid #dc2626',
          color: '#1f2937',
        },
      } as ExternalToast),

    info: (message: string, options?: ToastOptions) =>
      toast.info(message, {
        ...options,
        style: {
          background: '#eff6ff',
          border: '1px solid #3b82f6',
          color: '#1f2937',
        },
      } as ExternalToast),

    warning: (message: string, options?: ToastOptions) =>
      toast.warning(message, {
        ...options,
        style: {
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          color: '#1f2937',
        },
      } as ExternalToast),

    loading: (message: string) => toast.loading(message),

    dismiss: (id?: string | number) => toast.dismiss(id),
  }
}

