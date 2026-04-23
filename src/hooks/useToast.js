import { useRef, useCallback } from 'react';

/**
 * useToast — Simple hook to drive the Toast component
 * 
 * Usage:
 *   const { toastRef, showToast } = useToast();
 *   ...
 *   <Toast ref={toastRef} />
 *   ...
 *   showToast({ type: 'success', message: 'Done!' });
 */
export const useToast = () => {
  const toastRef = useRef(null);

  const showToast = useCallback(({ type = 'info', message, duration }) => {
    toastRef.current?.show({ type, message, duration });
  }, []);

  return { toastRef, showToast };
};
