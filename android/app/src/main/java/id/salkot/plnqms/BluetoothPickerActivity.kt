package id.salkot.plnqms

import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import id.salkot.plnqms.databinding.ActivityBluetoothPickerBinding

/**
 * Shows a list of already-paired Bluetooth devices so the operator
 * can select which one is the thermal printer.
 */
class BluetoothPickerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_DEVICE_ADDRESS = "device_address"
        private const val TAG = "BluetoothPicker"
    }

    private lateinit var binding: ActivityBluetoothPickerBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBluetoothPickerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val adapter = BluetoothAdapter.getDefaultAdapter()
        if (adapter == null || !adapter.isEnabled) {
            Log.w(TAG, "Bluetooth not available or disabled")
            setResult(Activity.RESULT_CANCELED)
            finish()
            return
        }

        val pairedDevices: Set<BluetoothDevice> = try {
            adapter.bondedDevices ?: emptySet()
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied reading bonded devices", e)
            emptySet()
        }

        if (pairedDevices.isEmpty()) {
            binding.emptyText.visibility = View.VISIBLE
            binding.recyclerView.visibility = View.GONE
            return
        }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = DeviceAdapter(pairedDevices.toList()) { device ->
            val result = Intent().putExtra(EXTRA_DEVICE_ADDRESS, device.address)
            setResult(Activity.RESULT_OK, result)
            finish()
        }
    }

    private class DeviceAdapter(
        private val devices: List<BluetoothDevice>,
        private val onPick: (BluetoothDevice) -> Unit
    ) : RecyclerView.Adapter<DeviceAdapter.VH>() {

        inner class VH(view: View) : RecyclerView.ViewHolder(view) {
            val name: TextView = view.findViewById(android.R.id.text1)
            val addr: TextView = view.findViewById(android.R.id.text2)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(android.R.layout.simple_list_item_2, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val dev = devices[position]
            val devName = try { dev.name ?: "Unknown" } catch (_: SecurityException) { "Unknown" }
            holder.name.text = devName
            holder.addr.text = dev.address
            holder.itemView.setOnClickListener { onPick(dev) }
        }

        override fun getItemCount() = devices.size
    }
}
