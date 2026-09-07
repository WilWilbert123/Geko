// In a real local embedding setup, you'd use a small model (e.g. all-MiniLM-L6-v2) 
// or a native binding like react-native-sentence-transformers to generate Float32Arrays.
// For the scope of this implementation without an explicit embedding native module in package.json,
// we will mock a deterministic 384-dim array generation based on a hash of the text,
// or you would load a secondary gguf for embeddings via llama.rn.

export const generateEmbedding = async (text: string): Promise<Float32Array> => {
  // Mock 384-dimensional embedding for sqlite-vec
  const vec = new Float32Array(384);
  
  // Create a pseudo-random deterministic vector based on text length and char codes
  // In production: Use an actual embedding model inference here.
  for (let i = 0; i < 384; i++) {
    vec[i] = (text.charCodeAt(i % text.length) || 0) / 255.0;
  }
  
  // Normalize vector
  let sum = 0;
  for (let i = 0; i < 384; i++) sum += vec[i] * vec[i];
  const magnitude = Math.sqrt(sum);
  for (let i = 0; i < 384; i++) vec[i] /= magnitude;
  
  return vec;
};
