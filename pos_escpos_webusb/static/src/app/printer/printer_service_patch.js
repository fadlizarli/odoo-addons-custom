/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PosPrinterService } from "@point_of_sale/app/printer/pos_printer_service";
import { htmlToCanvas } from "@point_of_sale/app/printer/render_service";
import { HardwareProxy } from "@point_of_sale/app/hardware_proxy/hardware_proxy_service";
import { _t } from "@web/core/l10n/translation";

patch(PosPrinterService.prototype, {
    setup(env) {
        super.setup(...arguments);
        this.env = env;
        const originalIs = this.is;
        this.is = () => {
            const webusb = this.getWebUSB();
            const useWebusb = Boolean(this.pos?.config?.use_webusb_printer ?? true);
            if (useWebusb && webusb?.isConnected) {
                return true;
            }
            return originalIs ? originalIs() : false;
        };
    },

    getWebUSB() {
        return this.env?.services?.webusb || this.pos?.env?.services?.webusb;
    },

    is() {
        const webusb = this.getWebUSB();
        const useWebusb = Boolean(this.pos?.config?.use_webusb_printer ?? true);
        if (useWebusb && webusb?.isConnected) {
            return true;
        }
        return super.is ? super.is() : false;
    },

    async printHtml(el, options = {}) {
        const webusb = this.getWebUSB();
        const useWebusb = Boolean(this.pos?.config?.use_webusb_printer ?? true);

        if (useWebusb && webusb) {
            if (webusb.isConnected) {
                try {
                    // Pastikan render-container ada di DOM agar htmlToCanvas tidak error
                    if (!document.querySelector(".render-container")) {
                        const fallbackContainer = document.createElement("div");
                        fallbackContainer.className = "render-container";
                        fallbackContainer.style.position = "fixed";
                        fallbackContainer.style.left = "-2000px";
                        fallbackContainer.style.top = "0";
                        document.body.appendChild(fallbackContainer);
                    }

                    console.log("[WebUSB] Mengonversi struk HTML ke Canvas...");
                    const canvas = await htmlToCanvas(el, { addClass: "pos-receipt-print" });
                    const paperWidth = this.pos?.config?.webusb_paper_width || "80mm";
                    const autoCut = this.pos?.config?.webusb_auto_cut !== false;
                    const openCashbox = Boolean(this.pos?.config?.webusb_open_cashbox);

                    console.log(`[WebUSB] Memulai kirim gambar canvas (${canvas.width}x${canvas.height}) ke printer USB...`);
                    await webusb.printCanvas(canvas, {
                        paperWidth,
                        autoCut,
                        openCashbox,
                    });
                    console.log("[WebUSB] Struk kasir berhasil dicetak!");
                    return true;
                } catch (error) {
                    console.error("[WebUSB] Gagal mencetak ke printer USB:", error);
                    return this.printHtmlAlternative(
                        {
                            title: _t("Gagal Cetak Printer USB"),
                            body:
                                (error.message || _t("Terjadi kendala saat mengirim data ke printer USB.")) +
                                "\n" +
                                _t("Apakah Anda ingin mencetak menggunakan dialog printer browser biasa?"),
                        },
                        el,
                        options
                    );
                }
            } else {
                console.warn("[WebUSB] Printer USB aktif pada konfigurasi tapi belum terhubung.");
                return this.printHtmlAlternative(
                    {
                        title: _t("Printer USB Belum Terhubung"),
                        body:
                            _t(
                                "Printer USB belum terhubung. Pastikan kabel printer USB terpasang dan klik ikon printer USB di navbar untuk menghubungkan."
                            ) +
                            "\n" +
                            _t("Apakah Anda ingin mencetak menggunakan dialog printer browser biasa?"),
                    },
                    el,
                    options
                );
            }
        }

        return super.printHtml(el, options);
    },
});

patch(HardwareProxy.prototype, {
    async openCashbox(action = false) {
        const webusb = this.env?.services?.webusb || this.pos?.env?.services?.webusb;
        const useWebusb = Boolean(this.pos?.config?.use_webusb_printer ?? true);
        if (useWebusb && webusb?.isConnected) {
            try {
                await webusb.openCashbox();
            } catch (err) {
                console.error("[WebUSB] Gagal membuka laci kasir:", err);
            }
        }
        return super.openCashbox(...arguments);
    },
});
