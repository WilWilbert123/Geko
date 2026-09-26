const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withGekoBuildGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;

      // 1. Inject C++20 and OpenCL arguments into cmake externalNativeBuild
      if (!buildGradle.includes('-std=c++20')) {
        const cmakeRegex = /cmake\s*\{([^}]*)\}/;
        buildGradle = buildGradle.replace(cmakeRegex, (match, inner) => {
          return `cmake {
                cppFlags "-std=c++20 -frtti -fexceptions"
                arguments "-DGGML_OPENCL=ON"
                \${inner}
            }`;
        });
      }

      // 2. Inject packagingOptions for C++ shared library if not exists
      if (!buildGradle.includes('pickFirst \'lib/x86/libc++_shared.so\'')) {
        const androidRegex = /android\s*\{/;
        buildGradle = buildGradle.replace(androidRegex, `android {
    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
    }`);
      }

      // 3. (Removed OpenCL dependency injection)

      config.modResults.contents = buildGradle;
    }
    return config;
  });
};

const withGekoProguard = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      if (fs.existsSync(proguardPath)) {
        let proguardContents = fs.readFileSync(proguardPath, 'utf-8');
        
        const rules = `
# op-sqlite
-keep class com.opengineering.opsqlite.** { *; }

# llama.rn
-keep class com.pocketpalai.llama.** { *; }
-keep class com.mybigday.llama.** { *; }

# react-native-mmkv
-keep class com.reactnativemmkv.** { *; }
`;
        if (!proguardContents.includes('-keep class com.opengineering.opsqlite')) {
          fs.writeFileSync(proguardPath, proguardContents + '\\n' + rules);
        }
      }
      return config;
    },
  ]);
};

module.exports = function withGekoNativeConfig(config) {
  config = withGekoBuildGradle(config);
  config = withGekoProguard(config);
  return config;
};
