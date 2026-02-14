package com.futscore.app

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.util.Rational
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PipModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PipModule"
    }

    @ReactMethod
    fun isSupported(promise: com.facebook.react.bridge.Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val supported = reactApplicationContext.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
            promise.resolve(supported)
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun enterPipMode(width: Int, height: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val activity = getCurrentActivity() as? Activity
            if (activity != null) {
                try {
                    val supported = activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
                    if (supported) {
                        val ratio = if (height > 0) Rational(width, height) else Rational(16, 9)
                        
                        // Limit ratio as per Android requirements (must be between 2.39:1 and 1:2.39)
                        val params = PictureInPictureParams.Builder()
                            .setAspectRatio(ratio)
                            .build()
                        activity.enterPictureInPictureMode(params)
                    }
                } catch (e: Exception) {
                    android.util.Log.e("PipModule", "Failed to enter PiP mode: ${e.message}")
                }
            }
        }
    }
}
