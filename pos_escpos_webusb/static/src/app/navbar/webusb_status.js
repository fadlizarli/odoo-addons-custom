/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { WebUSBPopup } from "../popups/webusb_popup";

export class WebUSBStatus extends Component {
    static template = "pos_escpos_webusb.WebUSBStatus";

    setup() {
        this.pos = usePos();
        this.popup = useService("popup");
        this.webusb = useService("webusb");
        this.webusbState = useState(this.webusb.state);
    }

    onClick() {
        this.popup.add(WebUSBPopup);
    }
}
