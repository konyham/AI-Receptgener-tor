// image.worker.js

// Helper function to convert ArrayBuffer to Base64 inside the worker
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary); // btoa is available in worker scope
};

self.onmessage = async (e) => {
  const { file, maxDimension } = e.data;

  try {
    // Modern, memory-efficient path using createImageBitmap and OffscreenCanvas
    if (typeof createImageBitmap !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
      const imageBitmap = await createImageBitmap(file, {
        resizeWidth: maxDimension,
        resizeHeight: maxDimension,
        resizeQuality: 'low',
      });

      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get OffscreenCanvas context.');
      }
      ctx.drawImage(imageBitmap, 0, 0);
      imageBitmap.close(); // Release memory immediately

      // Convert to blob, then to ArrayBuffer
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
      const arrayBuffer = await blob.arrayBuffer();
      
      // Convert ArrayBuffer to Base64 string *inside the worker*
      const base64Data = arrayBufferToBase64(arrayBuffer);

      // Post the final Base64 string back to the main thread
      self.postMessage({ success: true, data: base64Data, mimeType: 'image/jpeg' });
      
    } else {
      throw new Error('A böngésző nem támogatja a hatékony képfeldolgozáshoz szükséges modern API-kat. Próbálja meg egy másik böngészővel.');
    }
  } catch (error) {
    console.error('Error in image worker:', error);
    self.postMessage({ success: false, error: error.message });
  }
};