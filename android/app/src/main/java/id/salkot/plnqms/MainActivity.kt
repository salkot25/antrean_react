package id.salkot.plnqms

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import id.salkot.plnqms.databinding.ActivityMainBinding
import id.salkot.plnqms.print.PrintBridgeInterface

/**
 * Kiosk Activity: fullscreen WebView wrapping the deployed PLN QMS React app.
 * Exposes window.AndroidPrintBridge JS interface for thermal printing.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var printBridge: PrintBridgeInterface

    // Kiosk URL – pointing to the deployed React app
    private val kioskUrl = "https://antrean.salkot.online/ambil"
    private val kioskHost = "antrean.salkot.online"

    private val bluetoothPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val allGranted = grants.values.all { it }
        if (allGranted) {
            printBridge.onBluetoothPermissionsGranted()
        } else {
            printBridge.onBluetoothPermissionsDenied()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Kiosk: hide system UI
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupWebView()
    }

    @Suppress("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView: WebView = binding.webView

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }

        // Enable WebView debugging in debug builds
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        printBridge = PrintBridgeInterface(
            activity = this,
            webView = webView,
            onRequestBluetoothPermissions = { requestBluetoothPermissions() }
        )

        // Attach the JS bridge as window.AndroidPrintBridge
        webView.addJavascriptInterface(printBridge, "AndroidPrintBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url?.toString().orEmpty()
                return handleExternalNavigation(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                return handleExternalNavigation(url)
            }

            override fun onPageFinished(view: WebView, url: String) {
                binding.loadingView.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    binding.errorView.visibility = View.VISIBLE
                    binding.loadingView.visibility = View.GONE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                if (newProgress == 100) {
                    binding.loadingView.visibility = View.GONE
                }
            }
        }

        binding.loadingView.visibility = View.VISIBLE
        webView.loadUrl(kioskUrl)

        // Retry button
        binding.retryButton.setOnClickListener {
            binding.errorView.visibility = View.GONE
            binding.loadingView.visibility = View.VISIBLE
            webView.reload()
        }
    }

    private fun handleExternalNavigation(rawUrl: String): Boolean {
        if (rawUrl.isBlank()) return false

        val uri = runCatching { Uri.parse(rawUrl) }.getOrNull() ?: return false
        val scheme = (uri.scheme ?: "").lowercase()
        val host = (uri.host ?: "").lowercase()

        // Keep kiosk app pages inside WebView.
        if ((scheme == "http" || scheme == "https") && host == kioskHost) {
            return false
        }

        // Force WhatsApp-related navigations out to native app/browser.
        if (scheme == "intent") {
            return launchIntentUri(rawUrl)
        }
        if (scheme == "whatsapp") {
            return launchExternalUri(uri)
        }
        if ((scheme == "http" || scheme == "https") && (host == "api.whatsapp.com" || host == "wa.me")) {
            return launchExternalUri(uri)
        }

        return false
    }

    private fun launchIntentUri(rawUrl: String): Boolean {
        val intent = runCatching {
            Intent.parseUri(rawUrl, Intent.URI_INTENT_SCHEME)
        }.getOrNull() ?: return false

        return try {
            intent.addCategory(Intent.CATEGORY_BROWSABLE)
            intent.component = null
            intent.selector = null
            startActivity(intent)
            true
        } catch (_: ActivityNotFoundException) {
            // If the target app is not installed, try browser fallback URL in intent extras.
            val fallback = intent.getStringExtra("browser_fallback_url")
            if (!fallback.isNullOrBlank()) {
                launchExternalUri(Uri.parse(fallback))
            } else {
                false
            }
        }
    }

    private fun launchExternalUri(uri: Uri): Boolean {
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        return try {
            startActivity(intent)
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }

    fun requestBluetoothPermissions() {
        val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            )
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isEmpty()) {
            printBridge.onBluetoothPermissionsGranted()
        } else {
            bluetoothPermissionLauncher.launch(missing.toTypedArray())
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        printBridge.onPickerResult(requestCode, resultCode, data)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            // Re-apply immersive mode when focus returns
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
        }
    }

    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        }
        // Swallow back press in kiosk mode — do NOT call super to prevent exit
    }

    override fun onDestroy() {
        printBridge.destroy()
        binding.webView.destroy()
        super.onDestroy()
    }
}
