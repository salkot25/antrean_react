package id.salkot.plnqms.print

/**
 * Generates ESC/POS byte commands for 58mm thermal printers (e.g. Blueprint BP-LITE58).
 *
 * ESC/POS reference: https://reference.epson-biz.com/modules/ref_escpos/
 */
object EscPosEncoder {

    // ── Control bytes ─────────────────────────────────────────────────────────
    private val ESC  = byteArrayOf(0x1B)
    private val GS   = byteArrayOf(0x1D)
    private val LF   = byteArrayOf(0x0A)

    // Init / reset printer
    val INIT            = byteArrayOf(0x1B, 0x40)

    // Alignment
    val ALIGN_LEFT      = byteArrayOf(0x1B, 0x61, 0x00)
    val ALIGN_CENTER    = byteArrayOf(0x1B, 0x61, 0x01)
    val ALIGN_RIGHT     = byteArrayOf(0x1B, 0x61, 0x02)

    // Bold on/off
    val BOLD_ON         = byteArrayOf(0x1B, 0x45, 0x01)
    val BOLD_OFF        = byteArrayOf(0x1B, 0x45, 0x00)

    // Double-height text (for large queue number)
    val DOUBLE_HEIGHT_ON  = byteArrayOf(0x1B, 0x21, 0x10)
    val DOUBLE_HEIGHT_OFF = byteArrayOf(0x1B, 0x21, 0x00)

    // Double-width + double-height (largest text)
    val DOUBLE_SIZE_ON  = byteArrayOf(0x1B, 0x21, 0x30)
    val DOUBLE_SIZE_OFF = byteArrayOf(0x1B, 0x21, 0x00)

    // Cut paper — partial cut
    val CUT_PARTIAL     = byteArrayOf(0x1D, 0x56, 0x01)
    // Cut paper — full cut
    val CUT_FULL        = byteArrayOf(0x1D, 0x56, 0x00)

    // Feed N lines
    fun feedLines(n: Int): ByteArray = byteArrayOf(0x1B, 0x64, n.toByte())

    // Separator line (32 dashes fits 58mm)
    private fun separator(): ByteArray =
        text("-".repeat(32) + "\n")

    // Encode string to bytes (CP437 / latin-1 fallback)
    fun text(s: String): ByteArray = (s + "\n").toByteArray(Charsets.ISO_8859_1)

    fun textNoLf(s: String): ByteArray = s.toByteArray(Charsets.ISO_8859_1)

    /**
     * Build complete ESC/POS byte sequence for a queue ticket.
     *
     * Layout (58mm paper):
     * ┌────────────────────────────────┐
     * │        [OFFICE NAME]           │  centered, bold
     * │      NOMOR ANTRIAN             │  centered
     * │  ─────────────────────────  │
     * │           CS-001               │  centered, large
     * │  ─────────────────────────  │
     * │  Layanan: Customer Service     │
     * │  Waktu  : 25/04/2026 09:30:00  │
     * │  Nama   : Budi Santoso         │  (if present)
     * │  ─────────────────────────  │
     * │  Mohon tunggu hingga nomor     │  centered, small
     * │  Anda dipanggil                │
     * │  Terima kasih                  │
     * └────────────────────────────────┘
     */
    fun buildTicket(payload: TicketPayload): ByteArray {
        val buf = mutableListOf<ByteArray>()

        // Reset printer
        buf += INIT
        buf += feedLines(1)

        // Office name — centered, bold
        buf += ALIGN_CENTER
        buf += BOLD_ON
        buf += text(payload.officeName.uppercase().take(32))
        buf += BOLD_OFF

        // Title
        buf += text("NOMOR ANTRIAN")
        buf += separator()

        // Queue number — double size, bold
        buf += DOUBLE_SIZE_ON
        buf += BOLD_ON
        buf += text(payload.number)
        buf += BOLD_OFF
        buf += DOUBLE_SIZE_OFF

        buf += separator()

        // Details — left aligned
        buf += ALIGN_LEFT
        buf += text("Layanan : ${payload.serviceName.take(28)}")
        buf += text("Waktu   : ${payload.printedAt.take(28)}")

        if (payload.customerName.isNotBlank()) {
            buf += text("Nama    : ${payload.customerName.take(28)}")
        }

        buf += separator()

        // Footer — centered, italic simulation with spacing
        buf += ALIGN_CENTER
        buf += text("Mohon tunggu hingga nomor")
        buf += text("Anda dipanggil.")
        buf += feedLines(1)
        buf += text("Terima kasih")
        buf += feedLines(1)

        // Feed exactly 3mm past cutter blade then cut
        // GS V 66 n = feed n * 0.125mm then partial cut
        buf += byteArrayOf(0x1D, 0x56, 0x42, 0x18) // feed 24 dots (~3mm) then partial cut

        return buf.fold(ByteArray(0)) { acc, arr -> acc + arr }
    }
}
