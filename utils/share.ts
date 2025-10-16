// utils/share.ts

/**
 * Compresses a JSON object into a URL-safe, Base64-encoded string.
 * @param data The JSON object to encode.
 * @returns A promise that resolves to the encoded string.
 */
export const compressAndEncode = async (data: object): Promise<string> => {
    const jsonString = JSON.stringify(data);
    const stream = new TextEncoder().encode(jsonString);

    // Compress the stream using GZIP
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(stream);
    writer.close();

    // Read the compressed data into a single buffer
    const compressed = await new Response(cs.readable).arrayBuffer();
    const compressedArray = new Uint8Array(compressed);

    // Convert binary data to a Base64 string
    let base64String = '';
    for (let i = 0; i < compressedArray.length; i++) {
        base64String += String.fromCharCode(compressedArray[i]);
    }
    const regularBase64 = btoa(base64String);

    // Make the Base64 string URL-safe
    return regularBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};


/**
 * Decodes a URL-safe, Base64-encoded string and decompresses it back into a JSON object.
 * @param encoded The string from the URL.
 * @returns A promise that resolves to the original JSON object.
 */
export const decodeAndDecompress = async (encoded: string): Promise<object> => {
    // Convert URL-safe Base64 back to regular Base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }

    // Convert Base64 string to binary data
    const binaryString = atob(base64);
    const compressedArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        compressedArray[i] = binaryString.charCodeAt(i);
    }
    const stream = new Blob([compressedArray]).stream();

    // Decompress the stream
    const ds = new DecompressionStream('gzip');
    const decompressedStream = stream.pipeThrough(ds);

    // Read the decompressed data and parse it as JSON
    const jsonString = await new Response(decompressedStream).text();
    return JSON.parse(jsonString);
};
