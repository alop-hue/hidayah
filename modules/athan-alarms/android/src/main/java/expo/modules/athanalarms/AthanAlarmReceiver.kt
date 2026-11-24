package expo.modules.athanalarms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AthanAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val sound = intent.getStringExtra(AthanService.EXTRA_SOUND)
    val label = intent.getStringExtra(AthanService.EXTRA_LABEL)?.takeIf { it.isNotEmpty() } ?: "Athan"

    // Re-arm every prayer for the next occurrence before playback begins.
    AthanScheduler.rescheduleAll(context)

    if (sound.isNullOrEmpty()) {
      AthanService.postSilent(context, label)
    } else {
      AthanService.start(context, sound, label)
    }
  }
}

class AthanBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      -> AthanScheduler.rescheduleAll(context)
    }
  }
}
