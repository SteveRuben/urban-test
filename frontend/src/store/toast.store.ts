// Hook pour utiliser les toasts
import { create } from 'zustand';
import type { Toast } from '../components/ui/Toast';

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toastData) => {
    const toast: Toast = {
      ...toastData,
      id: Math.random().toString(36).substr(2, 9),
    };
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },
  clearAll: () => set({ toasts: [] }),
}));

// Hook d'utilisation simplifié
export const useToast = () => {
  const { addToast } = useToastStore();

  return {
    success: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'info', title, message, ...options }),
    
    custom: (toast: Omit<Toast, 'id'>) => addToast(toast),
  };
};

// Composant Container des Toasts
/* 
// CSS à ajouter à globals.css
const toastStyles = `
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
`;
// Exemple d'utilisation dans vos composants
export const ExampleUsage: React.FC = () => {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Succès !', 'Votre lettre a été sauvegardée.')}>
        Toast Success
      </button>
      
      <button onClick={() => toast.error('Erreur', 'Impossible de sauvegarder.')}>
        Toast Error
      </button>
      
      <button onClick={() => toast.info('Information', 'Nouvelle fonctionnalité disponible !', {
        action: {
          label: 'Découvrir',
          onClick: () => console.log('Action clicked')
        }
      })}>
        Toast with Action
      </button>
    </div>
  );
}; */