# -*- coding: utf-8 -*-
from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    pos_use_webusb_printer = fields.Boolean(
        related='pos_config_id.use_webusb_printer',
        readonly=False
    )
    pos_webusb_paper_width = fields.Selection(
        related='pos_config_id.webusb_paper_width',
        readonly=False
    )
    pos_webusb_auto_cut = fields.Boolean(
        related='pos_config_id.webusb_auto_cut',
        readonly=False
    )
    pos_webusb_open_cashbox = fields.Boolean(
        related='pos_config_id.webusb_open_cashbox',
        readonly=False
    )
