package id.salkot.plnqms.print

/**
 * Typed representation of the ticket payload received from the React web app.
 * Matches TicketPrintPayload in frontend/src/utils/printBridge.ts
 */
data class TicketPayload(
    val number: String,
    val serviceCode: String,
    val serviceName: String,
    val printedAt: String,
    val customerName: String,
    val officeName: String,
    val html: String? = null
)
