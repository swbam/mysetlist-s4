import { toast as sonnerToast } from 'sonner';

// Simple wrapper around sonner for consistency
export const useToast = () => {
  return {
    toast: (message: string, options?: { description?: string; type?: 'success' | 'error' | 'info' }) => {
      if (options?.type === 'error') {
        sonnerToast.error(message, { description: options?.description });
      } else if (options?.type === 'success') {
        sonnerToast.success(message, { description: options?.description });
      } else {
        sonnerToast(message, { description: options?.description });
      }
    },
  };
};

// Export toast function directly for those who prefer it
export const toast = (message: string, options?: { description?: string; type?: 'success' | 'error' | 'info' }) => {
  if (options?.type === 'error') {
    sonnerToast.error(message, { description: options?.description });
  } else if (options?.type === 'success') {
    sonnerToast.success(message, { description: options?.description });
  } else {
    sonnerToast(message, { description: options?.description });
  }
};