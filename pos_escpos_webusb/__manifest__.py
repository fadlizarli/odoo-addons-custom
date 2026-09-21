# -*- coding: utf-8 -*-
{
    'name': 'POS ESC/POS WebUSB Printer',
    'version': '17.0.1.0.0',
    'category': 'Point of Sale',
    'summary': 'Cetak Langsung Struk Kasir Thermal ESC/POS (80mm/58mm) via WebUSB Browser Tanpa IoT Box',
    'price': 10,
    'currency': 'USD', 
    'description': """
    
======================================================
POS ESC/POS WebUSB Direct Thermal Printing (Odoo 17 CE)
======================================================
Modul ini menambahkan fitur pencetakan langsung dari browser ke printer
thermal USB ESC/POS (seperti Iware XS 80 BT, Epson, Xprinter, dsb) via WebUSB API.

Fitur Utama:
------------
1. Cetak Langsung Tanpa Dialog Browser:
   - Mengirim data raster ESC/POS langsung ke printer USB tanpa memunculkan popup window.print.
   - Tidak memerlukan hardware tambahan seperti IoT Box atau PosBox.
2. Dioptimalkan untuk Iware XS 80 BT & Printer 80mm:
   - Ukuran kertas utama 80mm (576 dots per baris) dengan mapping 1:1 pixel super tajam.
   - Tersedia opsi switch ke 58mm (384 dots) di pengaturan backend POS.
   - Otomatis potong kertas (Auto Cut GS V 66 0).
   - Mendukung pembukaan laci kasir (Cash Drawer pulse ESC p via RJ11).
3. One-Time Pairing & Auto-Reconnect:
   - Kasir hanya perlu mengotorisasi printer USB satu kali saat awal.
   - Seterusnya browser otomatis terhubung kembali saat POS dibuka atau kabel USB dicolok ulang.
4. Mode Cetak Manual:
   - Tidak otomatis mencetak saat klik tombol Validate pembayaran.
   - Kasir mencetak nota secara sadar melalui tombol cetak di layar struk (ReceiptScreen)
     atau tombol cetak ulang (Reprint) di TicketScreen.
5. Indikator & Kontrol Langsung di POS:
   - Ikon status USB di Navbar POS (Hijau: Terhubung, Merah: Belum terhubung).
   - Dialog kontrol: tombol Hubungkan Printer, Test Print Nota, dan Test Buka Laci Kasir.
6. Fallback Cerdas:
   - Jika printer USB dicabut/mati, sistem memberikan notifikasi ramah dan opsi mencetak
     lewat dialog cetak browser biasa agar transaksi kasir tidak terganggu.
    """,
    'author': 'Fadli',
    'license': 'LGPL-3',
    'depends': ['point_of_sale'],
    'data': [
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_escpos_webusb/static/src/lib/bootstrap-icons/bootstrap-icons.css',
            'pos_escpos_webusb/static/src/scss/pos_webusb.scss',
            'pos_escpos_webusb/static/src/app/printer/escpos_raster.js',
            'pos_escpos_webusb/static/src/app/services/webusb_service.js',
            'pos_escpos_webusb/static/src/app/printer/printer_service_patch.js',
            'pos_escpos_webusb/static/src/app/popups/webusb_popup.js',
            'pos_escpos_webusb/static/src/app/popups/webusb_popup.xml',
            'pos_escpos_webusb/static/src/app/navbar/webusb_status.js',
            'pos_escpos_webusb/static/src/app/navbar/webusb_status.xml',
            'pos_escpos_webusb/static/src/app/navbar/navbar_patch.js',
            'pos_escpos_webusb/static/src/app/navbar/navbar_patch.xml',
        ],
    },
    'images': ['static/description/icon.png'],
    'installable': True,
    'auto_install': False,
    'application': False,
}
