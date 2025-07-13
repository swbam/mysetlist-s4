import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

// Simple wrapper around sonner for consistency
export const useToast = () => {
  return {
    toast: (options: ToastOptions) => {
      const { title, description, variant } = options;
      
      if (variant === 'destructive') {
        sonnerToast.error(title, { description });
      } else if (variant === 'success') {
        sonnerToast.success(title, { description });
      } else {
        sonnerToast(title, { description });
      }
    },
  };
};

// Export toast function directly for those who prefer it
export const toast = (options: ToastOptions) => {
  const { title, description, variant } = options;
  
  if (variant === 'destructive') {
    sonnerToast.error(title, { description });
  } else if (variant === 'success') {
    sonnerToast.success(title, { description });
  } else {
    sonnerToast(title, { description });
  }
};