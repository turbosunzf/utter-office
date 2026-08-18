package ai.multica.recording

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.WindowManager
import android.widget.TextView

class RecordingOverlayManager(private val context: Context) {
  private var windowManager: WindowManager? = null
  private var view: TextView? = null

  fun show(text: String) {
    if (!OverlayPermissionHelper.canDrawOverlays(context)) return
    if (!OverlaySettings.isEnabled(context)) return
    if (view != null) {
      view?.text = text
      return
    }
    val tv = TextView(context).apply {
      this.text = text
      setPadding(28, 16, 28, 16)
      setBackgroundColor(0xE63B6FFF.toInt())
      setTextColor(0xFFFFFFFF.toInt())
      textSize = 13f
    }
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
      y = 80
    }
    val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    runCatching { wm.addView(tv, params) }
    windowManager = wm
    view = tv
  }

  fun update(text: String) {
    view?.text = text
  }

  fun hide() {
    val v = view ?: return
    runCatching { windowManager?.removeView(v) }
    view = null
    windowManager = null
  }
}
