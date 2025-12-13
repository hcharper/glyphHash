/**
 * Encrypt file using WebCrypto API with AES-256-GCM
 */
export async function encryptFile(
  file: File,
): Promise<{
  encryptedData: ArrayBuffer;
  iv: string;
  key: string;
}> {
  // Generate encryption key
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Read file as ArrayBuffer
  const fileData = await file.arrayBuffer();

  // Encrypt
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    fileData,
  );

  // Export key for storage
  const exportedKey = await crypto.subtle.exportKey('raw', key);

  return {
    encryptedData,
    iv: arrayBufferToBase64(iv),
    key: arrayBufferToBase64(exportedKey),
  };
}

/**
 * Decrypt file using WebCrypto API
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  keyBase64: string,
  ivBase64: string,
): Promise<ArrayBuffer> {
  // Import key
  const keyData = base64ToArrayBuffer(keyBase64);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt'],
  );

  // Convert IV from base64
  const iv = base64ToArrayBuffer(ivBase64);

  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedData,
  );

  return decryptedData;
}

/**
 * Calculate SHA-256 hash of file
 */
export async function hashFile(file: File | ArrayBuffer): Promise<string> {
  const data = file instanceof File ? await file.arrayBuffer() : file;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
