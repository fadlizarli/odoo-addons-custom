/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { Navbar } from "@point_of_sale/app/navbar/navbar";
import { WebUSBStatus } from "./webusb_status";

patch(Navbar, {
    components: {
        ...Navbar.components,
        WebUSBStatus,
    },
});
