/** @odoo-module **/

import { reactive } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { canvasToEscpos, buildTestReceipt, DRAWER_KICK } from "../printer/escpos_raster";

const STORAGE_KEY = "pos_webusb_paired_device";
const CHUNK_SIZE = 4096;

export class WebUSBService {
    constructor(env, { popup, pos_notification }) {
        this.env = env;
        this.popup = popup;
        this.notification = pos_notification;
        this.device = null;
        this.interfaceNumber = null;
        this.endpointNumber = null;
        this.isPrinting = false;

        this.state = reactive({
            isSupported: Boolean(navigator?.usb),
            isConnected: false,
            deviceName: "",
            vendorId: null,
            productId: null,
            serialNumber: "",
            error: null,
        });

        this.setupListeners();
        this.autoReconnect();
    }

    get isConnected() {
        return Boolean(this.state.isConnected && this.device && this.device.opened);
    }

    setupListeners() {
        if (!navigator?.usb) return;

        navigator.usb.addEventListener("connect", async (event) => {
            console.log("[WebUSB] Perangkat USB dicolokkan:", event.device);
            const saved = this.getSavedDeviceInfo();
            if (saved && event.device.vendorId === saved.vendorId && event.device.productId === saved.productId) {
                try {
                    await this.connectDevice(event.device);
                    if (this.notification) {
                        this.notification.add(_t("Printer USB terhubung kembali!"), 3000);
                    }
                } catch (e) {
                    console.warn("[WebUSB] Gagal auto-reconnect perangkat:", e);
                }
            }
        });

        navigator.usb.addEventListener("disconnect", (event) => {
            console.log("[WebUSB] Perangkat USB dicabut:", event.device);
            if (this.device && event.device === this.device) {
                this.handleDisconnect(_t("Printer USB dicabut dari komputer."));
                if (this.notification) {
                    this.notification.add(_t("Printer USB terputus."), 3000);
                }
            }
        });
    }

    async autoReconnect() {
        if (!navigator?.usb) return;
        const saved = this.getSavedDeviceInfo();
        if (!saved) return;

        try {
            const devices = await navigator.usb.getDevices();
            const matched = devices.find(
                (d) => d.vendorId === saved.vendorId && d.productId === saved.productId
            );
            if (matched) {
                await this.connectDevice(matched);
                console.log("[WebUSB] Auto-reconnect berhasil:", matched.productName);
            }
        } catch (err) {
            console.warn("[WebUSB] Auto-reconnect gagal:", err);
        }
    }

    async requestAndConnect() {
        if (!navigator?.usb) {
            throw new Error(
                _t("WebUSB tidak didukung browser ini. Pastikan menggunakan Google Chrome atau Microsoft Edge via HTTPS / localhost.")
            );
        }
        let device;
        try {
            // filters kosong [] memungkinkan user memilih perangkat USB apa saja
            device = await navigator.usb.requestDevice({ filters: [] });
        } catch (e) {
            if (e.name === "NotFoundError") {
                // Kasir membatalkan dialog pemilihan USB
                return null;
            }
            throw e;
        }

        if (device) {
            return await this.connectDevice(device);
        }
        return null;
    }

    async connectDevice(device) {
        try {
            if (this.device && this.device.opened) {
                await this.disconnect();
            }

            this.device = device;
            await this.device.open();

            if (this.device.configuration === null) {
                await this.device.selectConfiguration(1);
            }

            // Cari bulk OUT endpoint dan interface yang sesuai
            let outEndpoint = null;
            let selectedInterface = null;

            for (const iface of this.device.configuration.interfaces) {
                for (const alt of iface.alternates) {
                    for (const ep of alt.endpoints) {
                        if (ep.direction === "out" && ep.type === "bulk") {
                            selectedInterface = iface.interfaceNumber;
                            outEndpoint = ep.endpointNumber;
                            break;
                        }
                    }
                    if (outEndpoint !== null) break;
                }
                if (outEndpoint !== null) break;
            }

            // Fallback: jika tidak ada bulk OUT spesifik, periksa sembarang endpoint OUT
            if (outEndpoint === null) {
                for (const iface of this.device.configuration.interfaces) {
                    for (const alt of iface.alternates) {
                        for (const ep of alt.endpoints) {
                            if (ep.direction === "out") {
                                selectedInterface = iface.interfaceNumber;
                                outEndpoint = ep.endpointNumber;
                                break;
                            }
                        }
                        if (outEndpoint !== null) break;
                    }
                }
            }

            if (outEndpoint === null || selectedInterface === null) {
                throw new Error(_t("Endpoint USB Bulk OUT tidak ditemukan pada perangkat printer ini."));
            }

            await this.device.claimInterface(selectedInterface);
            this.interfaceNumber = selectedInterface;
            this.endpointNumber = outEndpoint;

            this.saveDeviceInfo(device);

            this.state.isConnected = true;
            this.state.deviceName = device.productName || "Iware XS 80 BT / ESC-POS Printer";
            this.state.vendorId = device.vendorId;
            this.state.productId = device.productId;
            this.state.serialNumber = device.serialNumber || "";
            this.state.error = null;

            return device;
        } catch (err) {
            this.handleDisconnect(err.message);
            throw err;
        }
    }

    async disconnect() {
        if (this.device && this.device.opened) {
            try {
                if (this.interfaceNumber !== null) {
                    await this.device.releaseInterface(this.interfaceNumber);
                }
                await this.device.close();
            } catch (e) {
                console.warn("[WebUSB] Gagal close USB device:", e);
            }
        }
        this.clearDeviceInfo();
        this.handleDisconnect();
    }

    handleDisconnect(errorMessage = null) {
        this.device = null;
        this.interfaceNumber = null;
        this.endpointNumber = null;
        this.state.isConnected = false;
        this.state.deviceName = "";
        this.state.error = errorMessage;
    }

    saveDeviceInfo(device) {
        try {
            const info = {
                vendorId: device.vendorId,
                productId: device.productId,
                productName: device.productName || "USB Thermal Printer",
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
        } catch (e) {
            console.error("[WebUSB] Gagal menyimpan device info ke localStorage:", e);
        }
    }

    getSavedDeviceInfo() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    clearDeviceInfo() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error("[WebUSB] Gagal menghapus device info:", e);
        }
    }

    async sendRawData(uint8Data, chunkSize = 2048, delayMs = 8) {
        if (!this.isConnected) {
            throw new Error(_t("Printer USB belum terhubung."));
        }
        try {
            const totalBytes = uint8Data.length;
            for (let offset = 0; offset < totalBytes; offset += chunkSize) {
                const chunk = uint8Data.subarray(
                    offset,
                    Math.min(offset + chunkSize, totalBytes)
                );
                await this.device.transferOut(this.endpointNumber, chunk);
                // Jeda mikro antar-chunk hanya untuk data besar (raster nota) agar buffer printer thermal tidak overflow
                if (delayMs > 0 && offset + chunkSize < totalBytes) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
            return true;
        } catch (err) {
            console.error("[WebUSB] transferOut error:", err);
            if (err.name === "NetworkError" || !this.device?.opened) {
                this.handleDisconnect(err.message);
            }
            throw err;
        }
    }

    async printCanvas(canvas, options = {}) {
        while (this.isPrinting) {
            console.warn("[WebUSB] Cetak sedang berlangsung, mengantri...");
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.isPrinting = true;
        try {
            console.log(`[WebUSB] Memproses konversi canvas (${canvas.width}x${canvas.height}) ke perintah ESC/POS raster...`);
            const data = canvasToEscpos(canvas, options);
            console.log(`[WebUSB] Mengirim ${data.length} bytes ke printer USB...`);
            await this.sendRawData(data, 2048, 8);
            console.log("[WebUSB] Sukses mengirim data nota ke printer.");
            return true;
        } finally {
            this.isPrinting = false;
        }
    }

    async testPrint(options = {}) {
        const data = buildTestReceipt(options);
        return await this.sendRawData(data);
    }

    async openCashbox() {
        return await this.sendRawData(DRAWER_KICK);
    }
}

export const webusbService = {
    dependencies: ["popup", "pos_notification"],
    start(env, { popup, pos_notification }) {
        return new WebUSBService(env, { popup, pos_notification });
    },
};

registry.category("services").add("webusb", webusbService);
