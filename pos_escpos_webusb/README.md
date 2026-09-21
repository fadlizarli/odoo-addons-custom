# POS ESC/POS WebUSB Printer (`pos_escpos_webusb`)

Modul Odoo 17 Community Edition untuk pencetakan langsung struk thermal kasir ESC/POS via **WebUSB API** langsung dari browser kasir (Google Chrome / Microsoft Edge) tanpa membutuhkan IoT Box / PosBox dan tanpa popup dialog cetak browser (`window.print()`).

Dioptimalkan secara khusus untuk printer thermal **80mm** seperti **Iware XS 80 BT**, Epson TM series, Xprinter, Panda, dsb.

---

## Fitur Utama

1. **Direct USB Printing**:
   - Struk kasir dicetak langsung melalui kabel USB dalam hitungan milidetik.
   - Tidak ada popup dialog print browser (`window.print()`) yang memperlambat kasir.
2. **Kualitas Cetak Tajam & Presisi (1:1 Pixel Mapping)**:
   - Menggunakan mode ESC/POS Raster (`GS v 0`) beresolusi 576 dots per baris (80mm) atau 384 dots (58mm).
   - Layout struk 100% identik dengan layar Odoo (termasuk logo toko, barcode/QR code, dan watermark cetak ulang jika ada).
3. **One-Time Pairing & Auto-Reconnect**:
   - Kasir cukup melakukan otorisasi printer satu kali saat pertama kali digunakan.
   - Sistem otomatis terhubung kembali saat kasir membuka POS atau saat kabel USB dicolok ulang.
4. **Alur Cetak Manual Sesuai Kebutuhan Kasir**:
   - Tidak otomatis mencetak saat tombol Validate pembayaran ditekan.
   - Kasir meninjau nota di layar struk (*ReceiptScreen*), lalu menekan tombol **Print Receipt** (atau cetak ulang di *TicketScreen*).
5. **Dukungan Auto Cut & Cash Drawer**:
   - Otomatis memotong kertas nota via perintah ESC/POS (`GS V 66 0`).
   - Mendukung pembukaan laci kasir otomatis via port RJ11 printer (`ESC p`).
6. **Indikator Status di Navbar POS**:
   - Ikon status printer di header POS (🟢 Hijau = Terhubung, 🔴 Merah = Belum Terhubung).
   - Panel dialog untuk Test Print nota dan Test Buka Laci Kasir.

---

## Persyaratan Lingkungan (System Requirements)

1. **Browser**: Google Chrome, Microsoft Edge, Opera, atau browser berbasis Chromium lainnya (desktop PC/laptop dan tablet Android via USB OTG).
2. **Protokol Koneksi**:
   - WebUSB adalah *Secure Context API*, sehingga wajib diakses melalui protokol **HTTPS** (contoh: `https://pos.tokosaya.com`).
   - Pada tahap development/lokal, `http://localhost` atau `http://127.0.0.1` otomatis diperbolehkan oleh browser.

---

## Panduan Penggunaan

### 1. Konfigurasi di Odoo Backend
1. Masuk ke **Point of Sale > Configuration > Settings**.
2. Gulir ke bagian **Connected Devices**.
3. Centang **WebUSB Direct Printing**.
4. Pilih **Lebar Kertas**: `80mm (576 dots - Iware XS 80 / Standar)`.
5. Centang opsi **Auto Cut Kertas** dan **Buka Laci Kasir** jika diperlukan.
6. Klik **Save**.

### 2. Pairing Printer di POS (Pertama Kali)
1. Buka sesi kasir Point of Sale di browser Google Chrome / MS Edge.
2. Pada Navbar/Header kanan atas, perhatikan tombol ikon printer dengan badge **USB**.
3. Klik ikon tersebut untuk membuka jendela **Pengaturan Printer WebUSB**.
4. Klik tombol **"Pilih & Hubungkan Printer USB"**.
5. Browser akan memunculkan popup daftar perangkat USB. Pilih nama printer (misal: *Iware*, *Thermal Printer*, atau *USB Printing Support*), lalu klik **Hubungkan / Connect**.
6. Status akan berubah menjadi **Terhubung (🟢 Hijau)**.
7. Klik tombol **"Test Print Nota"** untuk memastikan printer mencetak dan memotong kertas dengan baik.

---

## Catatan Khusus Sistem Operasi (OS Drivers)

### Linux (Ubuntu / Debian)
Pada Linux, driver kernel `usblp` terkadang mengunci port printer USB secara default. Jika muncul pesan *Unable to claim interface*, Anda dapat membuat aturan udev:
```bash
sudo nano /etc/udev/rules.d/99-usb-printers.rules
```
Tambahkan baris berikut (mengizinkan akses read/write ke printer USB):
```udev
SUBSYSTEM=="usb", ATTR{bInterfaceClass}=="07", MODE="0666"
```
Lalu reload aturan udev:
```bash
sudo udevadm control --reload-rules && sudo udevadm trigger
```

### Windows
Jika menggunakan Windows, printer USB umumnya langsung terdeteksi. Pastikan tidak ada aplikasi POS lain yang sedang membuka port printer secara eksklusif.

---

## Lisensi
LGPL-3. Dikembangkan untuk Odoo 17 Community Edition.
