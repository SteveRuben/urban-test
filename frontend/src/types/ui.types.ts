// src/types/ui.types.ts

// Types liés à l'interface utilisateur
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  status: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  isClosable?: boolean;
}