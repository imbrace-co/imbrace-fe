import { strToU8, zipSync } from 'fflate';

export const sanitizeFileBaseName = (name?: string) => {
    return name?.trim().replace(/\s+/g, '_').replace(/[^\w.-]+/g, '') || 'AI_Agent';
};

// EOCD signature per PKZIP APPNOTE 4.3.16. fflate does not expose the EOCD
// "zip file comment" field, so we locate the existing EOCD and rewrite its
// 2-byte comment-length field + append the comment bytes.
const EOCD_SIGNATURE = 0x06054b50;

const findEocdOffset = (bytes: Uint8Array): number => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const maxScan = Math.min(bytes.length, 22 + 0xffff);
    for (let i = bytes.length - 22; i >= bytes.length - maxScan && i >= 0; i--) {
        if (dv.getUint32(i, true) === EOCD_SIGNATURE) {
            const commentLen = dv.getUint16(i + 20, true);
            if (i + 22 + commentLen === bytes.length) return i;
        }
    }
    return -1;
};

const injectEocdComment = (zipBytes: Uint8Array, comment: string): Uint8Array => {
    const commentBytes = strToU8(comment);
    if (commentBytes.length > 0xffff) {
        throw new Error(`Zip comment exceeds 65535 bytes (got ${commentBytes.length})`);
    }
    const eocd = findEocdOffset(zipBytes);
    if (eocd < 0) throw new Error('EOCD not found in zip output');

    const out = new Uint8Array(eocd + 22 + commentBytes.length);
    out.set(zipBytes.subarray(0, eocd + 22), 0);
    out[eocd + 20] = commentBytes.length & 0xff;
    out[eocd + 21] = (commentBytes.length >> 8) & 0xff;
    out.set(commentBytes, eocd + 22);
    return out;
};

export const createSingleFileZipBlob = ({
    filename,
    content,
    comment,
}: {
    filename: string;
    content: string;
    comment?: string;
}) => {
    let zipBytes = zipSync(
        {
            [filename]: strToU8(content),
        },
        // level 0 = store (no compression), fast and deterministic for JSON export
        { level: 0 },
    );

    if (comment) {
        zipBytes = injectEocdComment(zipBytes, comment);
    }

    const arrayBuffer = new ArrayBuffer(zipBytes.byteLength);
    new Uint8Array(arrayBuffer).set(zipBytes);
    return new Blob([arrayBuffer], { type: 'application/zip' });
};

// Read the EOCD "zip file comment" without decompressing any file payload.
// This is the canonical zip comment that `unzip -z` and standard libs read.
export const readZipComment = async (zip: Blob | ArrayBuffer | Uint8Array): Promise<string | undefined> => {
    const bytes =
        zip instanceof Uint8Array
            ? zip
            : zip instanceof ArrayBuffer
              ? new Uint8Array(zip)
              : new Uint8Array(await zip.arrayBuffer());
    const eocd = findEocdOffset(bytes);
    if (eocd < 0) return undefined;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const commentLen = dv.getUint16(eocd + 20, true);
    if (commentLen === 0) return undefined;
    return new TextDecoder('utf-8').decode(bytes.subarray(eocd + 22, eocd + 22 + commentLen));
};

export const downloadBlob = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    const href = URL.createObjectURL(blob);
    link.setAttribute('target', '_blank');
    link.setAttribute('href', href);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
};

