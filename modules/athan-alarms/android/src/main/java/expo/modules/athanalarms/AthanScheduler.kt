package expo.modules.athanalarms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Persists the prayer schedule and arms one exact alarm per prayer. Alarms are
 * re-armed for the next day when they fire and after a reboot/time change.
 */
object AthanScheduler {
  private const val PREFS = "noor_athan_alarms"
  private const val KEY = "alarms"
  private const val EXTRA_PRAYER = "prayer"
  private const val ALARM_ACTION = "expo.modules.athanalarms.ALARM"

  data class Alarm(
    val prayer: String,
    val hour: Int,
    val minute: Int,
    val sound: String?,
    val label: String,
  )

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return manager.canScheduleExactAlarms()
  }

  fun scheduleAll(context: Context, alarms: List<Alarm>) {
    save(context, alarms)
    alarms.forEach { scheduleNext(context, it) }
  }

  fun rescheduleAll(context: Context) {
    load(context).forEach { scheduleNext(context, it) }
  }

  fun cancelAll(context: Context) {
    load(context).forEach { cancel(context, it) }
    save(context, emptyList())
  }

  fun scheduleNext(context: Context, alarm: Alarm) {
    val triggerAt = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, alarm.hour)
      set(Calendar.MINUTE, alarm.minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
      if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
    }.timeInMillis

    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pending = pendingIntent(context, alarm)
    try {
      val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()
      if (exact) {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
      } else {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
      }
    } catch (_: SecurityException) {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
    }
  }

  fun scheduleOneShot(context: Context, seconds: Int, sound: String?, label: String) {
    val triggerAt = System.currentTimeMillis() + seconds.coerceAtLeast(1) * 1000L
    val intent = Intent(context, AthanAlarmReceiver::class.java).apply {
      action = ALARM_ACTION
      putExtra(EXTRA_PRAYER, "test")
      putExtra(AthanService.EXTRA_SOUND, sound)
      putExtra(AthanService.EXTRA_LABEL, label)
    }
    val pending = PendingIntent.getBroadcast(
      context,
      999_001,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    try {
      val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()
      if (exact) {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
      } else {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
      }
    } catch (_: SecurityException) {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
    }
  }

  private fun cancel(context: Context, alarm: Alarm) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    manager.cancel(pendingIntent(context, alarm))
  }

  private fun pendingIntent(context: Context, alarm: Alarm): PendingIntent {
    val intent = Intent(context, AthanAlarmReceiver::class.java).apply {
      action = ALARM_ACTION
      putExtra(EXTRA_PRAYER, alarm.prayer)
      putExtra(AthanService.EXTRA_SOUND, alarm.sound)
      putExtra(AthanService.EXTRA_LABEL, alarm.label)
    }
    return PendingIntent.getBroadcast(
      context,
      requestCode(alarm),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun requestCode(alarm: Alarm): Int = alarm.prayer.hashCode() and 0x7fffffff

  private fun save(context: Context, alarms: List<Alarm>) {
    val array = JSONArray()
    alarms.forEach { alarm ->
      array.put(JSONObject().apply {
        put("prayer", alarm.prayer)
        put("hour", alarm.hour)
        put("minute", alarm.minute)
        put("label", alarm.label)
        if (alarm.sound != null) put("sound", alarm.sound)
      })
    }
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY, array.toString())
      .apply()
  }

  private fun load(context: Context): List<Alarm> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
      ?: return emptyList()
    return try {
      val array = JSONArray(raw)
      (0 until array.length()).mapNotNull { index ->
        val row = array.optJSONObject(index) ?: return@mapNotNull null
        Alarm(
          prayer = row.optString("prayer"),
          hour = row.optInt("hour"),
          minute = row.optInt("minute"),
          sound = if (row.has("sound")) row.optString("sound") else null,
          label = row.optString("label"),
        )
      }
    } catch (_: Exception) {
      emptyList()
    }
  }
}
