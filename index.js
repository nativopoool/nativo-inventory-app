const { registerRootComponent } = require('expo');

// Error Handler Global Ultra-Temprano
if (typeof global.ErrorUtils !== 'undefined') {
  const previousHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[CRITICAL_BOOT_ERROR]', error);
    // Intentaremos dejar una marca en la consola nativa
    if (previousHandler) {
      previousHandler(error, isFatal);
    }
  });
}

// Fallback global para evitar ReferenceErrors en módulos mal importados
global.SAFE_AREA = global.SAFE_AREA || { top: 24, bottom: 0 };

const App = require('./App').default;

registerRootComponent(App);
