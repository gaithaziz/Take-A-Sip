package com.takeasip.frontdesk

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.sunmi.peripheral.printer.InnerPrinterCallback
import com.sunmi.peripheral.printer.InnerPrinterManager
import com.sunmi.peripheral.printer.SunmiPrinterService
import kotlin.math.PI
import kotlin.math.sin

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
      val maxWidth = 160
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
      val safeDurationMs = (durationMs ?: 6000).coerceIn(3000, 8000)
      Thread {
        playAlertMelody(safeDurationMs)
      }.start()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("BEEP_FAILED", e)
    }
  }

  private fun playAlertMelody(durationMs: Int) {
    val sampleRate = 22050
    val notes = listOf(
      Pair(880.0, 260),
      Pair(0.0, 50),
      Pair(1174.66, 260),
      Pair(0.0, 50),
      Pair(1318.51, 420),
      Pair(0.0, 80),
      Pair(1174.66, 260),
      Pair(0.0, 50),
      Pair(1318.51, 260),
      Pair(0.0, 50),
      Pair(1567.98, 520),
      Pair(0.0, 120),
      Pair(1318.51, 260),
      Pair(0.0, 50),
      Pair(1174.66, 260),
      Pair(0.0, 50),
      Pair(987.77, 420),
      Pair(0.0, 80),
      Pair(1174.66, 260),
      Pair(0.0, 50),
      Pair(1318.51, 260),
      Pair(0.0, 50),
      Pair(1760.0, 520),
      Pair(0.0, 120),
      Pair(1567.98, 420),
      Pair(0.0, 70),
      Pair(1318.51, 420),
      Pair(0.0, 70),
      Pair(1174.66, 420)
    )
    val scaledNotes = scaleNotesToDuration(notes, durationMs)
    val totalSamples = scaledNotes.sumOf { (_, noteMs) -> (sampleRate * noteMs / 1000.0).toInt() }
    val pcm = ShortArray(totalSamples)
    var offset = 0

    scaledNotes.forEach { (frequency, noteMs) ->
      val noteSamples = (sampleRate * noteMs / 1000.0).toInt()
      for (i in 0 until noteSamples) {
        val sample = if (frequency <= 0.0) {
          0.0
        } else {
          val fadeSamples = (sampleRate * 0.018).toInt().coerceAtLeast(1)
          val attack = (i.toDouble() / fadeSamples.toDouble()).coerceIn(0.0, 1.0)
          val release = ((noteSamples - i).toDouble() / fadeSamples.toDouble()).coerceIn(0.0, 1.0)
          val envelope = minOf(attack, release)
          sin(2.0 * PI * frequency * i.toDouble() / sampleRate.toDouble()) * envelope * 0.94
        }
        pcm[offset + i] = (sample * Short.MAX_VALUE).toInt().toShort()
      }
      offset += noteSamples
    }

    val audioTrack = AudioTrack.Builder()
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      .setAudioFormat(
        AudioFormat.Builder()
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .setSampleRate(sampleRate)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .build()
      )
      .setTransferMode(AudioTrack.MODE_STATIC)
      .setBufferSizeInBytes(pcm.size * 2)
      .build()

    try {
      audioTrack.setVolume(AudioTrack.getMaxVolume())
      audioTrack.write(pcm, 0, pcm.size)
      audioTrack.play()
      Thread.sleep(durationMs.toLong() + 150L)
    } finally {
      try {
        audioTrack.stop()
      } catch (_: Exception) {
        // Ignore stop failures if playback has already ended.
      }
      audioTrack.release()
    }
  }

  private fun scaleNotesToDuration(notes: List<Pair<Double, Int>>, targetDurationMs: Int): List<Pair<Double, Int>> {
    val baseDurationMs = notes.sumOf { (_, noteMs) -> noteMs }
    val ratio = targetDurationMs.toDouble() / baseDurationMs.toDouble()
    return notes.map { (frequency, noteMs) -> Pair(frequency, (noteMs * ratio).toInt().coerceAtLeast(25)) }
  }

}
