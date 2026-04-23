const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config Plugin to add adi-registration.properties for Google Developer Verification
 */
const withAdiRegistration = (config, { token }) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resourceDir = path.join(projectRoot, 'android/app/src/main/resources');
      const assetsDir = path.join(projectRoot, 'android/app/src/main/assets');

      // Ensure directories exist
      [resourceDir, assetsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      const tokenContent = token; // Solo el token, como dicen las instrucciones
      
      fs.writeFileSync(path.join(resourceDir, 'adi-registration.properties'), tokenContent);
      fs.writeFileSync(path.join(assetsDir, 'adi-registration.properties'), tokenContent);
      
      console.log(`[withAdiRegistration] Created adi-registration.properties in resources and assets.`);
      return config;
    },
  ]);
};

module.exports = (config) => {
  const token = 'DJOEJOYBTGEAYAAAAAAAAAAAAA'; // El token proporcionado por el usuario
  return withAdiRegistration(config, { token });
};
