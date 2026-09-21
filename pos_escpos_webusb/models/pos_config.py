# -*- coding: utf-8 -*-
from odoo import fields, models


class PosConfig(models.Model):
    _inherit = 'pos.config'

    use_webusb_printer = fields.Boolean(
        string="WebUSB Direct Printing",
        default=True,
        help="Cetak struk thermal ESC/POS langsung via WebUSB tanpa popup dialog cetak browser (window.print) dan tanpa IoT Box."
    )
    webusb_paper_width = fields.Selection(
        [
            ('80mm', '80mm (576 dots - Iware XS 80 / Standar)'),
            ('58mm', '58mm (384 dots)'),
        ],
        string="Lebar Kertas WebUSB",
        default='80mm',
        required=True,
        help="Ukuran lebar kertas thermal printer yang digunakan."
    )
    webusb_auto_cut = fields.Boolean(
        string="Auto Cut Kertas",
        default=True,
        help="Kirim perintah pemotong kertas otomatis (ESC/POS GS V 66 0) setelah nota selesai dicetak."
    )
    webusb_open_cashbox = fields.Boolean(
        string="Buka Laci Kasir (Cash Drawer)",
        default=False,
        help="Kirim sinyal pulse (ESC p) ke port RJ11 printer untuk membuka laci kasir saat nota dicetak."
    )
