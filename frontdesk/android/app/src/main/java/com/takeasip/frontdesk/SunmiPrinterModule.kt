package com.takeasip.frontdesk

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper
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

  private fun requirePrinterService(): SunmiPrinterService {
    return printerService ?: throw IllegalStateException("Sunmi printer service is not connected")
  }

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
      requirePrinterService().setAlignment(alignment, null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SET_ALIGNMENT_FAILED", e)
    }
  }

  @ReactMethod
  fun printText(text: String, promise: Promise) {
    try {
      requirePrinterService().printText(text, null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("PRINT_TEXT_FAILED", e)
    }
  }

  @ReactMethod
  fun printShopLogo(promise: Promise) {
    try {
      val source = BitmapFactory.decodeResource(reactContext.resources, R.drawable.shop_logo)
        ?: throw IllegalStateException("Shop logo resource could not be decoded")
      val maxWidth = 320
      val scaled = if (source.width > maxWidth) {
        val ratio = maxWidth.toFloat() / source.width.toFloat()
        Bitmap.createScaledBitmap(source, maxWidth, (source.height * ratio).toInt(), true)
      } else {
        source
      }

      requirePrinterService().printBitmap(scaled, null)
      if (scaled != source) {
        scaled.recycle()
      }
      source.recycle()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("PRINT_LOGO_FAILED", e)
    }
  }

  @ReactMethod
  fun lineWrap(lines: Int, promise: Promise) {
    try {
      requirePrinterService().lineWrap(lines, null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("LINE_WRAP_FAILED", e)
    }
  }

  @ReactMethod
  fun cutPaper(promise: Promise) {
    try {
      requirePrinterService().cutPaper(null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CUT_PAPER_FAILED", e)
    }
  }

  @ReactMethod
  fun beep(durationMs: Int?, promise: Promise) {
    try {
      val safeDurationMs = (durationMs ?: 700).coerceIn(320, 1400)
      val pulseMs = (safeDurationMs / 2).coerceIn(160, 480)
      val alarmTone = ToneGenerator(AudioManager.STREAM_ALARM, 100)
      val notificationTone = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)
      val musicTone = ToneGenerator(AudioManager.STREAM_MUSIC, 100)
      val tones = listOf(alarmTone, notificationTone, musicTone)

      // Two-step alert chime sounds clearer and longer than a single short beep.
      tones.forEach { it.startTone(ToneGenerator.TONE_PROP_BEEP2, pulseMs) }
      Handler(Looper.getMainLooper()).postDelayed({
        tones.forEach { it.startTone(ToneGenerator.TONE_PROP_ACK, pulseMs) }
      }, (pulseMs + 90).toLong())

      Handler(Looper.getMainLooper()).postDelayed({
        try {
          tones.forEach { tone ->
            tone.stopTone()
            tone.release()
          }
        } catch (_: Exception) {
          // Ignore release failures.
        }
      }, ((pulseMs * 2) + 220).toLong())
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("BEEP_FAILED", e)
    }
  }

}
