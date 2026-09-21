/** @odoo-module **/

export const DRAWER_KICK = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);

/**
 * Persiapkan canvas agar sesuai dengan lebar cetak printer thermal (576 dots untuk 80mm, 384 dots untuk 58mm).
 * Jika lebar canvas asli lebih kecil atau sama (misal 512px di Odoo), struk akan diposisikan di tengah (centered)
 * dengan mapping 1:1 pixel tanpa blur/interpolasi.
 */
function prepareCanvas(sourceCanvas, targetWidth) {
    if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) {
        const fallback = document.createElement("canvas");
        fallback.width = targetWidth;
        fallback.height = 100;
        const ctxFallback = fallback.getContext("2d");
        ctxFallback.fillStyle = "#ffffff";
        ctxFallback.fillRect(0, 0, targetWidth, 100);
        return fallback;
    }

    const finalCanvas = document.createElement("canvas");
    const ctx = finalCanvas.getContext("2d", { willReadFrequently: true });

    if (sourceCanvas.width <= targetWidth) {
        finalCanvas.width = targetWidth;
        finalCanvas.height = sourceCanvas.height;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, sourceCanvas.height);
        const offsetX = Math.floor((targetWidth - sourceCanvas.width) / 2);
        ctx.drawImage(sourceCanvas, offsetX, 0);
    } else {
        const scale = targetWidth / sourceCanvas.width;
        const targetHeight = Math.round(sourceCanvas.height * scale);
        finalCanvas.width = targetWidth;
        finalCanvas.height = targetHeight;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    }

    return finalCanvas;
}

/**
 * Konversi elemen Canvas HTML ke perintah byte stream ESC/POS Raster (GS v 0).
 * Menggunakan teknik slicing per 128 baris untuk mencegah buffer overflow pada memori printer.
 */
export function canvasToEscpos(sourceCanvas, options = {}) {
    const targetWidth = options.paperWidth === "58mm" ? 384 : 576;
    const canvas = prepareCanvas(sourceCanvas, targetWidth);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const bytesPerRow = targetWidth / 8;
    const SLICE_HEIGHT = 128;
    const parts = [];

    // ESC @ (Initialize printer)
    parts.push(new Uint8Array([0x1B, 0x40]));

    // Sinyal buka laci kasir (jika diaktifkan)
    if (options.openCashbox) {
        parts.push(DRAWER_KICK);
    }

    // Proses per slice vertikal
    for (let startY = 0; startY < canvas.height; startY += SLICE_HEIGHT) {
        const sliceH = Math.min(SLICE_HEIGHT, canvas.height - startY);
        const sliceData = new Uint8Array(bytesPerRow * sliceH);

        for (let y = 0; y < sliceH; y++) {
            const rowOffset = (startY + y) * targetWidth;
            const outOffset = y * bytesPerRow;

            for (let b = 0; b < bytesPerRow; b++) {
                let byteVal = 0;
                const baseX = b * 8;
                for (let bit = 0; bit < 8; bit++) {
                    const px = baseX + bit;
                    const idx = (rowOffset + px) * 4;
                    const a = data[idx + 3];
                    if (a >= 128) {
                        // Luminance formula (ITU-R BT.601)
                        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                        if (lum < 185) {
                            byteVal |= (1 << (7 - bit));
                        }
                    }
                }
                sliceData[outOffset + b] = byteVal;
            }
        }

        // Header GS v 0 (Raster bit image command)
        const header = new Uint8Array([
            0x1D, 0x76, 0x30, 0x00,
            bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF,
            sliceH & 0xFF, (sliceH >> 8) & 0xFF
        ]);

        parts.push(header);
        parts.push(sliceData);
    }

    // Feed 4 lines agar nota melewati bilah pemotong (cutter)
    parts.push(new Uint8Array([0x1B, 0x64, 0x04]));

    // Auto cut kertas (GS V 66 0 -> partial cut)
    if (options.autoCut !== false) {
        parts.push(new Uint8Array([0x1D, 0x56, 0x42, 0x00]));
    }

    // Gabungkan seluruh chunk perintah ke satu Uint8Array
    const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const p of parts) {
        combined.set(p, offset);
        offset += p.length;
    }

    return combined;
}

/**
 * Bangun byte stream untuk nota uji coba (Test Print) langsung via ESC/POS text command.
 */
export function buildTestReceipt(options = {}) {
    const encoder = new TextEncoder();
    const parts = [];

    // ESC @ (Reset/Init)
    parts.push(new Uint8Array([0x1B, 0x40]));

    if (options.openCashbox) {
        parts.push(DRAWER_KICK);
    }

    // Align Center
    parts.push(new Uint8Array([0x1B, 0x61, 0x01]));

    // Double height + bold
    parts.push(new Uint8Array([0x1B, 0x21, 0x30]));
    parts.push(encoder.encode("IWARE XS 80 BT\n"));

    // Normal font
    parts.push(new Uint8Array([0x1B, 0x21, 0x00]));
    parts.push(encoder.encode("Odoo 17 POS - WebUSB Direct Print\n"));
    parts.push(encoder.encode("------------------------------------------\n"));

    // Align Left
    parts.push(new Uint8Array([0x1B, 0x61, 0x00]));
    const now = new Date().toLocaleString("id-ID");
    const pWidth = options.paperWidth || "80mm";
    parts.push(encoder.encode(`Status       : TERHUBUNG (OK)\n`));
    parts.push(encoder.encode(`Lebar Kertas : ${pWidth} (576 dots)\n`));
    parts.push(encoder.encode(`Waktu        : ${now}\n`));
    parts.push(encoder.encode(`Protokol     : ESC/POS Raster + WebUSB\n`));
    parts.push(encoder.encode("------------------------------------------\n"));

    // Align Center
    parts.push(new Uint8Array([0x1B, 0x61, 0x01]));
    parts.push(encoder.encode("*** TEST PRINT BERHASIL ***\n"));
    parts.push(encoder.encode("Printer siap digunakan untuk transaksi kasir!\n\n"));

    // Feed 4 lines
    parts.push(new Uint8Array([0x1B, 0x64, 0x04]));

    // Auto Cut
    if (options.autoCut !== false) {
        parts.push(new Uint8Array([0x1D, 0x56, 0x42, 0x00]));
    }

    const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const p of parts) {
        combined.set(p, offset);
        offset += p.length;
    }

    return combined;
}
