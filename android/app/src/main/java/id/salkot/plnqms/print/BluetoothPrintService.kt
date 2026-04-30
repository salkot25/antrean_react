package id.salkot.plnqms.print

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.UUID

/**
 * Manages Bluetooth Classic SPP connection and ESC/POS data transmission
 * to a thermal printer (e.g. Blueprint BP-LITE58).
 *
 * SPP UUID is the standard serial profile UUID used by virtually all
 * Bluetooth Classic thermal printers.
 */
class BluetoothPrintService(private val context: Context) {

    companion object {
        private const val TAG = "BluetoothPrintService"

        // Standard SPP (Serial Port Profile) UUID
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

        // Write chunk size — keep small for stability on budget BT modules
        private const val CHUNK_SIZE = 512
    }

    sealed class PrintResult {
        data object Success : PrintResult()
        data class Error(val reason: String) : PrintResult()
    }

    private var socket: BluetoothSocket? = null
    private var pairedDeviceAddress: String? = null

    /** Pair with device by address and persist for subsequent prints. */
    fun setPairedDevice(address: String) {
        pairedDeviceAddress = address
        Log.i(TAG, "Paired device set: $address")
    }

    fun getPairedDeviceAddress(): String? = pairedDeviceAddress

    /**
     * Print [bytes] to the currently paired Bluetooth printer.
     * Attempts to reuse an existing socket; reconnects if needed.
     * Must be called from a coroutine (uses Dispatchers.IO internally).
     */
    suspend fun print(bytes: ByteArray): PrintResult = withContext(Dispatchers.IO) {
        val address = pairedDeviceAddress
            ?: return@withContext PrintResult.Error("no_device_paired")

        val adapter: BluetoothAdapter? = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
            ?: BluetoothAdapter.getDefaultAdapter()

        if (adapter == null) {
            return@withContext PrintResult.Error("bluetooth_not_supported")
        }

        if (!adapter.isEnabled) {
            return@withContext PrintResult.Error("bluetooth_disabled")
        }

        val device: BluetoothDevice = try {
            adapter.getRemoteDevice(address)
        } catch (e: IllegalArgumentException) {
            return@withContext PrintResult.Error("invalid_device_address")
        }

        return@withContext try {
            ensureConnected(device)
            writeChunked(bytes)
            Log.i(TAG, "Print success: ${bytes.size} bytes sent")
            PrintResult.Success
        } catch (e: IOException) {
            Log.e(TAG, "Print failed: ${e.message}", e)
            close()
            PrintResult.Error("io_error: ${e.message?.take(80) ?: "unknown"}")
        } catch (e: SecurityException) {
            Log.e(TAG, "Bluetooth permission denied: ${e.message}", e)
            PrintResult.Error("permission_denied")
        }
    }

    /** Ensure SPP socket is connected; create or recreate as needed. */
    private fun ensureConnected(device: BluetoothDevice) {
        val existing = socket
        if (existing != null && existing.isConnected) return

        close()

        Log.i(TAG, "Connecting to ${device.address}...")
        val newSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)
        BluetoothAdapter.getDefaultAdapter()?.cancelDiscovery()
        newSocket.connect()
        socket = newSocket
        Log.i(TAG, "Connected to ${device.address}")
    }

    /** Write bytes in chunks to avoid overflowing printer buffer. */
    private fun writeChunked(bytes: ByteArray) {
        val os = socket?.outputStream
            ?: throw IOException("Output stream unavailable")

        var offset = 0
        while (offset < bytes.size) {
            val end = minOf(offset + CHUNK_SIZE, bytes.size)
            os.write(bytes, offset, end - offset)
            offset = end
        }
        os.flush()
    }

    fun close() {
        try {
            socket?.close()
        } catch (_: IOException) {
        } finally {
            socket = null
        }
    }

    fun isConnected(): Boolean = socket?.isConnected == true
}
