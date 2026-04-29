package id.salkot.plnqms

import android.app.Application
import android.util.Log

class QMSApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i("QMSApplication", "PLN QMS Kiosk started")
    }
}
