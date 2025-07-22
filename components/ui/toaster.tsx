// components/ui/toaster.tsx
'use client';

import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  // NO ToastAction import here, as the 'action' prop is already the element
} from '@/components/ui/toast'; // Ensure this path is correct

export function Toaster() {
  // dismiss is destructured but not used in this specific render logic
  const { toasts, dismiss } = useToast(); 

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, open, onOpenChange, ...props }) => (
        <Toast
          key={id}
          variant={variant}
          open={open}
          onOpenChange={onOpenChange}
          {...props}
        >
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {/* CRITICAL FIX: Render 'action' directly. It's already the JSX element. */}
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}