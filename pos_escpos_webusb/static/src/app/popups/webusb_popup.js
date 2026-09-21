/** @odoo-module **/

import { AbstractAwaitablePopup } from "@point_of_sale/app/popup/abstract_awaitable_popup";
import { useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { _t } from "@web/core/l10n/translation";

export class WebUSBPopup extends AbstractAwaitablePopup {
    static template = "pos_escpos_webusb.WebUSBPopup";
    static defaultProps = {
        closeText: _t("Tutup"),
        title: _t("Pengaturan Printer WebUSB"),
    };

    setup() {
        super.setup();
        this.pos = usePos();
        this.webusb = useService("webusb");
        this.notification = useService("pos_notification");
        this.webusbState = useState(this.webusb.state);
        this.state = useState({
            loading: false,
            feedback: "",
            feedbackType: "",
        });
    }

    async onConnectPrinter() {
        this.state.loading = true;
        this.state.feedback = "";
        try {
            const dev = await this.webusb.requestAndConnect();
            if (dev) {
                this.state.feedback = _t("Berhasil terhubung ke: ") + (dev.productName || "Printer USB");
                this.state.feedbackType = "success";
            }
        } catch (err) {
            this.state.feedback = err.message || _t("Gagal menghubungkan printer.");
            this.state.feedbackType = "danger";
        } finally {
            this.state.loading = false;
        }
    }

    async onDisconnectPrinter() {
        this.state.loading = true;
        this.state.feedback = "";
        try {
            await this.webusb.disconnect();
            this.state.feedback = _t("Printer USB telah diputuskan.");
            this.state.feedbackType = "info";
        } catch (err) {
            this.state.feedback = err.message || _t("Gagal memutuskan printer.");
            this.state.feedbackType = "danger";
        } finally {
            this.state.loading = false;
        }
    }

    async onTestPrint() {
        this.state.loading = true;
        this.state.feedback = "";
        try {
            const paperWidth = this.pos.config.webusb_paper_width || "80mm";
            const autoCut = this.pos.config.webusb_auto_cut !== false;
            await this.webusb.testPrint({ paperWidth, autoCut });
            this.state.feedback = _t("Perintah test print berhasil dikirim ke printer!");
            this.state.feedbackType = "success";
        } catch (err) {
            this.state.feedback = err.message || _t("Gagal melakukan test print.");
            this.state.feedbackType = "danger";
        } finally {
            this.state.loading = false;
        }
    }

    async onTestCashbox() {
        this.state.loading = true;
        this.state.feedback = "";
        try {
            await this.webusb.openCashbox();
            this.state.feedback = _t("Perintah buka laci kasir berhasil dikirim!");
            this.state.feedbackType = "success";
        } catch (err) {
            this.state.feedback = err.message || _t("Gagal membuka laci kasir.");
            this.state.feedbackType = "danger";
        } finally {
            this.state.loading = false;
        }
    }
}
