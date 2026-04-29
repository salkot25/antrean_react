# Add project specific ProGuard rules here.
-keep class id.salkot.plnqms.** { *; }
-keepclassmembers class id.salkot.plnqms.print.PrintBridgeInterface {
    @android.webkit.JavascriptInterface <methods>;
}
