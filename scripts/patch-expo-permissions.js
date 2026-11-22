const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'adapters',
  'react',
  'permissions',
  'PermissionsService.kt'
);

try {
  if (fs.existsSync(targetPath)) {
    let content = fs.readFileSync(targetPath, 'utf8');
    const target = 'return requestedPermissions.contains(permission)';
    const replacement = 'return requestedPermissions?.contains(permission) == true';
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log('[postinstall] Patched PermissionsService.kt for Android SDK 36 nullability.');
    }
  }
} catch (err) {
  console.warn('[postinstall] Failed to patch PermissionsService.kt:', err.message);
}
