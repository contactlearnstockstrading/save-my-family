import Sound from 'react-native-sound';
import { Platform, NativeModules } from 'react-native';

// Enable playing sound in silence mode on iOS
if (Platform.OS === 'ios') {
  Sound.setCategory('Playback', true); // Second param 'mixWithOthers' enables background playing
}

class SoundService {
  private sirenSound: Sound | null = null;
  private isAlertLooping: boolean = false;

  constructor() {
    // Load local siren file (expected in android/app/src/main/res/raw/siren.mp3 or iOS MainBundle)
    this.sirenSound = new Sound('siren.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.warn('Failed to load emergency siren sound file:', error);
      } else {
        this.sirenSound?.setNumberOfLoops(-1); // Infinite looping during emergency
        this.sirenSound?.setVolume(1.0); // Maximum app-level volume
      }
    });
  }

  /**
   * Triggers the alarm siren. Bypasses normal silence modes on Android by routing through the ALARM channel
   */
  public playSiren = () => {
    if (this.isAlertLooping) return;

    if (Platform.OS === 'android') {
      // Direct android utility module to raise stream volume to maximum during emergency
      try {
        const { AudioManager } = NativeModules;
        if (AudioManager) {
          // STREAM_ALARM = 4, adjust volume to max
          AudioManager.setStreamVolume(4, AudioManager.getStreamMaxVolume(4), 0);
        }
      } catch (err) {
        console.log('Unable to auto-maximize hardware volume:', err);
      }
    }

    this.isAlertLooping = true;
    this.sirenSound?.play((success) => {
      if (!success) {
        console.warn('Siren playback finished due to error');
      }
    });
  };

  /**
   * Stops the active emergency alarm siren
   */
  public stopSiren = () => {
    this.isAlertLooping = false;
    this.sirenSound?.stop();
  };

  /**
   * Plays a quick notification beep to wake up the screen/alert volunteers (independent of siren)
   */
  public playAlertBeep = () => {
    const beep = new Sound('beep.mp3', Sound.MAIN_BUNDLE, (err) => {
      if (!err) {
        beep.setVolume(1.0);
        beep.play(() => beep.release());
      }
    });
  };
}

export const soundService = new SoundService();
