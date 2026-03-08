package com.takeasip.frontdesk

import android.media.AudioManager
import android.media.ToneGenerator
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.SunmiPrinterService

class SunmiPrinterModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var printerService: SunmiPrinterService? = null

  override fun getName(): String = "SunmiPrinterModule"

  @ReactMethod
  fun initPrinter(promise: Promise) {
    try {
      InnerPrinterManager.getInstance().bindService(reactContext, object : InnerPrinterCallback() {
        override fun onConnected(service: SunmiPrinterService) {
          printerService = service
          promise.resolve(null)
        }

        override fun onDisconnected() {
          printerService = null
        }
      })
    } catch (e: Exception) {
      promise.reject("INIT_PRINTER_FAILED", e)
    }
  }

  @ReactMethod
  fun setAlignment(alignment: Int, promise: Promise) {
    try {
      printerService?.setAlignment(alignment, null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SET_ALIGNMENT_FAILED", e)
    }
  }

  @ReactMethod
  fun printText(text: String, promise: Promise) {
    try {
      printerService?.printText(text, null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("PRINT_TEXT_FAILED", e)
    }
  }

  @ReactMethod
  fun lineWrap(lines: Int, promise: Promise) {
    try {
      printerService?.lineWrap(lines, null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("LINE_WRAP_FAILED", e)
    }
  }

  @ReactMethod
  fun cutPaper(promise: Promise) {
    try {
      printerService?.cutPaper(null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CUT_PAPER_FAILED", e)
    }
  }

  @ReactMethod
  fun beep(promise: Promise) {
    try {
      val tone = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
      tone.startTone(ToneGenerator.TONE_PROP_BEEP, 300)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("BEEP_FAILED", e)
    }
  }
}
