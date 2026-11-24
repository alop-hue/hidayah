package expo.modules.athanalarms

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AthanAlarmsModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "React context is unavailable" }

  override fun definition() = ModuleDefinition {
    Name("AthanAlarms")

    AsyncFunction("scheduleAll") { alarms: List<Map<String, Any?>> ->
      val parsed = alarms.mapNotNull { row ->
        val prayer = row["prayer"] as? String ?: return@mapNotNull null
        val hour = (row["hour"] as? Number)?.toInt() ?: return@mapNotNull null
        val minute = (row["minute"] as? Number)?.toInt() ?: return@mapNotNull null
        AthanScheduler.Alarm(
          prayer = prayer,
          hour = hour,
          minute = minute,
          sound = (row["sound"] as? String)?.takeIf { it.isNotEmpty() },
          label = row["label"] as? String ?: prayer,
        )
      }
      AthanScheduler.scheduleAll(context, parsed)
      parsed.size
    }

    AsyncFunction("cancelAll") {
      AthanScheduler.cancelAll(context)
    }

    AsyncFunction("playNow") { sound: String, label: String ->
      AthanService.start(context, sound, label)
    }

    AsyncFunction("playIn") { seconds: Int, sound: String, label: String ->
      AthanScheduler.scheduleOneShot(context, seconds, sound, label)
    }

    AsyncFunction("stop") {
      AthanService.stop(context)
    }

    Function("canScheduleExactAlarms") {
      AthanScheduler.canScheduleExact(context)
    }
  }
}
