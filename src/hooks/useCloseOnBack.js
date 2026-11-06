import { useEffect, useRef } from 'react';

// Hace que el botón/gesto "atrás" del celular cierre el modal abierto en vez de salir del sitio.
//
// Usa CloseWatcher (Chrome/Edge/Samsung Internet desde la versión 120): mientras el modal está abierto,
// "atrás" en Android (y Escape en la computadora) cierra el modal de más arriba y no navega.
// No agrega entradas al historial, así que no choca con React Router.
// Funciona aunque el usuario no haya tocado la página: el primer modal sin interacción también se cierra
// (es el caso del link directo a un producto). Sin interacción, varios modales abiertos se cierran juntos.
//
// En navegadores sin CloseWatcher (Safari/iPhone, Firefox) no hace nada y "atrás" navega como siempre.
// Para el link directo a un producto, ShopView además arma el historial [tienda → producto].
export const useCloseOnBack = (isOpen, onClose) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen || typeof window.CloseWatcher !== 'function') return undefined;

    let watcher;
    try {
      watcher = new window.CloseWatcher();
    } catch {
      return undefined; // Ej.: documento no activo. "Atrás" queda con su comportamiento normal.
    }
    watcher.onclose = () => onCloseRef.current();
    // Si el modal se cierra desde la app (cruz, acción), se descarta el watcher sin disparar onclose
    return () => watcher.destroy();
  }, [isOpen]);
};
