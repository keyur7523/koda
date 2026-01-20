import { toast } from 'sonner'

export function useToast() {
  return {
    success: (message: string) => 
      toast.success(message, {
        style: { 
          background: '#e6f7f4', 
          border: '1px solid #00b894',
          color: '#1f2937' 
        },
      }),
      
    error: (message: string) => 
      toast.error(message, {
        style: { 
          background: '#fef2f2', 
          border: '1px solid #dc2626',
          color: '#1f2937' 
        },
      }),
      
    info: (message: string) => 
      toast.info(message, {
        style: { 
          background: '#eff6ff', 
          border: '1px solid #3b82f6',
          color: '#1f2937' 
        },
      }),

    warning: (message: string) => 
      toast.warning(message, {
        style: { 
          background: '#fffbeb', 
          border: '1px solid #f59e0b',
          color: '#1f2937' 
        },
      }),
      
    loading: (message: string) => 
      toast.loading(message),
      
    dismiss: (id?: string | number) => 
      toast.dismiss(id),
  }
}

