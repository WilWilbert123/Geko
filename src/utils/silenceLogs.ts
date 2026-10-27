/**
 * Filters known-harmless third-party console noise (Metro terminal + LogBox).
 * Must be imported FIRST in App.tsx so it runs before other modules load.
 */
import { LogBox } from 'react-native';

const IGNORED_PATTERNS = [
  '`new NativeEventEmitter()` was called with a non-null argument',
  'EXGL: gl.pixelStorei',
];

const isIgnored = (args: unknown[]) =>
  typeof args[0] === 'string' && IGNORED_PATTERNS.some((p) => (args[0] as string).includes(p));

(['log', 'warn'] as const).forEach((level) => {
  const original = console[level];
  console[level] = (...args: unknown[]) => {
    if (isIgnored(args)) return;
    original(...args);
  };
});

LogBox.ignoreLogs(IGNORED_PATTERNS);
