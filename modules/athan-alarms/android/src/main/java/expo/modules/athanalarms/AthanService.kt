package expo.modules.athanalarms

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

/**
 * Plays the selected athan to completion in a foreground service. Notification
 * channel sounds are truncated by the OS after a few seconds, so the full
 * recording has to be played through a media player instead.
 */
class AthanService : Service() {
  companion object {
    const val EXTRA_SOUND = "sound"
    const val EXTRA_LABEL = "label"
    const val ACTION_STOP = "expo.modules.athanalarms.STOP"

    private const val CHANNEL_PLAYBACK = "athan-playback"
    private const val CHANNEL_REMINDER = "athan-reminder"
    private const val NOTIFICATION_ID = 4211
    private const val SILENT_NOTIFICATION_ID = 4212

    fun start(context: Context, sound: String, label: String) {
      val intent = Intent(context, AthanService::class.java).apply {
        putExtra(EXTRA_SOUND, sound)
        putExtra(EXTRA_LABEL, label)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, AthanService::class.java))
    }

    fun postSilent(context: Context, label: String) {
      val manager = context.getSystemService(NotificationManager::class.java) ?: return
      ensureReminderChannel(context, manager)
      manager.notify(SILENT_NOTIFICATION_ID, reminderNotification(context, label, CHANNEL_REMINDER))
    }

    private fun ensureReminderChannel(context: Context, manager: NotificationManager) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      if (manager.getNotificationChannel(CHANNEL_REMINDER) != null) return
      val channel = NotificationChannel(CHANNEL_REMINDER, "Prayer reminder", NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(null, null)
        enableVibration(true)
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }

    private fun reminderNotification(context: Context, label: String, channelId: String): Notification {
      val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, channelId)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(context)
      }
      return builder
        .setSmallIcon(context.applicationInfo.icon)
        .setContentTitle(label)
        .setContentText("It is time for prayer")
        .setContentIntent(openAppIntent(context))
        .setAutoCancel(true)
        .build()
    }

    fun openAppIntent(context: Context): PendingIntent {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      } ?: Intent()
      return PendingIntent.getActivity(
        context,
        0,
        launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }

  private var player: MediaPlayer? = null
  private var focusRequest: AudioFocusRequest? = null
  private val audioManager by lazy { getSystemService(Context.AUDIO_SERVICE) as AudioManager }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null || intent.action == ACTION_STOP) {
      stopPlayback()
      return START_NOT_STICKY
    }
    val label = intent.getStringExtra(EXTRA_LABEL) ?: "Athan"
    val sound = intent.getStringExtra(EXTRA_SOUND)
    ensurePlaybackChannel()
    startForeground(NOTIFICATION_ID, playbackNotification(label))
    if (sound.isNullOrEmpty()) {
      stopPlayback()
      return START_NOT_STICKY
    }
    play(sound)
    return START_NOT_STICKY
  }

  private fun play(sound: String) {
    releasePlayer()
    val resourceId = resources.getIdentifier(sound, "raw", packageName)
    if (resourceId == 0) {
      stopPlayback()
      return
    }
    val mediaPlayer = MediaPlayer()
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
      .build()
    try {
      mediaPlayer.setAudioAttributes(attributes)
      mediaPlayer.setWakeMode(applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
      mediaPlayer.setDataSource(this, Uri.parse("android.resource://$packageName/raw/$sound"))
      mediaPlayer.setOnPreparedListener { it.start() }
      mediaPlayer.setOnCompletionListener { stopPlayback() }
      mediaPlayer.setOnErrorListener { _, _, _ ->
        stopPlayback()
        true
      }
      mediaPlayer.prepareAsync()
    } catch (_: Exception) {
      mediaPlayer.release()
      stopPlayback()
      return
    }
    player = mediaPlayer
    requestFocus(attributes)
  }

  private fun requestFocus(attributes: AudioAttributes) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(attributes)
        .setOnAudioFocusChangeListener { change ->
          if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            stopPlayback()
          }
        }
        .build()
      focusRequest = request
      audioManager.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
    }
  }

  private fun releasePlayer() {
    player?.let {
      try {
        it.stop()
      } catch (_: IllegalStateException) {
        // already stopped
      }
      it.release()
    }
    player = null
  }

  private fun abandonFocus() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      audioManager.abandonAudioFocus(null)
    }
    focusRequest = null
  }

  private fun stopPlayback() {
    releasePlayer()
    abandonFocus()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  private fun ensurePlaybackChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_PLAYBACK) != null) return
    val channel = NotificationChannel(CHANNEL_PLAYBACK, "Athan playback", NotificationManager.IMPORTANCE_LOW).apply {
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun playbackNotification(label: String): Notification {
    val stopIntent = Intent(this, AthanService::class.java).setAction(ACTION_STOP)
    val stopPending = PendingIntent.getService(
      this,
      1,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_PLAYBACK)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    return builder
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(label)
      .setContentText("Athan is playing")
      .setContentIntent(openAppIntent(this))
      .addAction(
        Notification.Action.Builder(
          Icon.createWithResource(this, android.R.drawable.ic_media_pause),
          "Stop",
          stopPending,
        ).build(),
      )
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .build()
  }
}
