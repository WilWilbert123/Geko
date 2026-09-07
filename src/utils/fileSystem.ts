// Utility to resolve paths for LLM models which might be in external storage
// Or bundled assets. For Android, GGUF models are large and typically downloaded to
// context.getExternalFilesDir or similar.
import { Platform } from 'react-native';

export const getModelPath = (modelFilename: string): string => {
  // In a real app, this would use react-native-fs to locate the file in Document/External Storage
  if (Platform.OS === 'android') {
    return `/storage/emulated/0/Download/${modelFilename}`;
  }
  return `/${modelFilename}`; // iOS placeholder
};
