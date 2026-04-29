package id.salkot.plnqms.print

import android.content.Intent
import android.content.SharedPreferences
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import id.salkot.plnqms.BluetoothPickerActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import android.util.Log

/**
 * JavaScript interface exposed as window.AndroidPrintBridge in the WebView.
 *
 * Contract matches frontend/src/utils/printBridge.ts:
 *   window.AndroidPrintBridge.printTicket(jsonPayload: string) → string ("ok" | error reason)
 *   window.AndroidPrintBridge.getPrinterStatus() → string (JSON: {connected, address})
 *   window.AndroidPrintBridge.pickPrinter() → void (opens BT device picker, result via JS callback)
 */
class PrintBridgeInterface(
    private val activity: AppCompatActivity,
    private val webView: WebView,
    private val onRequestBluetoothPermissions: () -> Unit
) {
    companion object {
        private const val TAG = "PrintBridgeInterface"
        private const val PREF_FILE = "pln_qms_prefs"
        private const val PREF_PRINTER_ADDRESS = "printer_address"
        const val REQUEST_PICK_PRINTER = 1001
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val printService = BluetoothPrintService()
    private val prefs: SharedPreferences =
        activity.getSharedPreferences(PREF_FILE, AppCompatActivity.MODE_PRIVATE)

    init {
        // Restore previously paired printer address
        prefs.getString(PREF_PRINTER_ADDRESS, null)?.let { addr ->
            printService.setPairedDevice(addr)
            Log.i(TAG, "Restored paired printer: $addr")
        }
    }

    // ── JS-callable methods ────────────────────────────────────────────────────

    /**
     * Called by web app: window.AndroidPrintBridge.printTicket(jsonString)
     * Returns "ok" on success or an error reason string synchronously
     * (the coroutine result is delivered back via JS callback for async UX).
     */
    @JavascriptInterface
    fun printTicket(payloadJson: String): String {
        return try {
            val json = JSONObject(payloadJson)
            val payload = TicketPayload(
                number = json.optString("number", "???"),
                serviceCode = json.optString("serviceCode", ""),
                serviceName = json.optString("serviceName", ""),
                printedAt = json.optString("printedAt", ""),
                customerName = json.optString("customerName", ""),
                officeName = json.optString("officeName", "PLN"),
                html = if (json.has("html")) json.getString("html") else null
            )

            // Schedule async print; return acknowledgement immediately
            schedulePrint(payload)
            "ok"
        } catch (e: Exception) {
            Log.e(TAG, "printTicket parse error: ${e.message}", e)
            "parse_error: ${e.message?.take(80)}"
        }
    }

    /** Alias method name supported for compatibility. */
    @JavascriptInterface
    fun printThermal(payloadJson: String): String = printTicket(payloadJson)

    /**
     * Returns JSON: {"connected": bool, "address": "XX:XX:..."}
     */
    @JavascriptInterface
    fun getPrinterStatus(): String {
        val address = printService.getPairedDeviceAddress() ?: ""
        val connected = printService.isConnected()
        return """{"connected":$connected,"address":"$address"}"""
    }

    /**
     * Opens BluetoothPickerActivity so the user can select a paired printer.
     * Result is delivered back via onPickerResult() and then to JS via callback.
     */
    @JavascriptInterface
    fun pickPrinter() {
        activity.runOnUiThread {
            onRequestBluetoothPermissions()
        }
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    private fun schedulePrint(payload: TicketPayload) {
        scope.launch {
            val bytes = EscPosEncoder.buildTicket(payload)
            val result = printService.print(bytes)

            when (result) {
                is BluetoothPrintService.PrintResult.Success -> {
                    Log.i(TAG, "Print success: ${payload.number}")
                    notifyWebPrintResult(success = true, reason = null, number = payload.number)
                }
                is BluetoothPrintService.PrintResult.Error -> {
                    Log.w(TAG, "Print error: ${result.reason}")

                    // If printer is not paired yet, open the picker automatically
                    if (result.reason == "no_device_paired") {
                        openBluetoothPicker()
                    }

                    notifyWebPrintResult(success = false, reason = result.reason, number = payload.number)
                }
            }
        }
    }

    /**
     * Notifies the web page about async print completion via a JS function call.
     * The web layer can listen via window.onAndroidPrintResult if needed.
     */
    private fun notifyWebPrintResult(success: Boolean, reason: String?, number: String) {
        val js = buildString {
            append("if(typeof window.onAndroidPrintResult === 'function'){")
            append("window.onAndroidPrintResult(")
            append("{success:$success,")
            append("reason:${if (reason != null) "\"${reason.replace("\"", "\\\"")}\"" else "null"},")
            append("number:\"$number\"")
            append("})")
            append("}")
        }
        activity.runOnUiThread {
            webView.evaluateJavascript(js, null)
        }
    }

    private fun openBluetoothPicker() {
        activity.runOnUiThread {
            val intent = Intent(activity, BluetoothPickerActivity::class.java)
            activity.startActivityForResult(intent, REQUEST_PICK_PRINTER)
        }
    }

    /** Called when Bluetooth permissions are granted. */
    fun onBluetoothPermissionsGranted() {
        openBluetoothPicker()
    }

    /** Called when Bluetooth permissions are denied. */
    fun onBluetoothPermissionsDenied() {
        notifyWebPrintResult(
            success = false,
            reason = "permission_denied",
            number = ""
        )
    }

    /** Called from MainActivity.onActivityResult */
    fun onPickerResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_PICK_PRINTER) return
        val address = data?.getStringExtra(BluetoothPickerActivity.EXTRA_DEVICE_ADDRESS)
        if (!address.isNullOrBlank()) {
            printService.setPairedDevice(address)
            prefs.edit().putString(PREF_PRINTER_ADDRESS, address).apply()
            Log.i(TAG, "Printer paired and saved: $address")
        }
    }

    fun destroy() {
        scope.cancel()
        printService.close()
    }
}
