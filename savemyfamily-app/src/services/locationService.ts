import { PermissionsAndroid, Platform } from 'react-native';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

class LocationService {
  /**
   * Request standard and background location access permissions from the mobile OS
   */
  public async requestLocationPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS triggers prompts automatically when location functions are called.
      // Custom keys must be present in Info.plist.
      return true;
    }

    if (Platform.OS === 'android') {
      try {
        const fineGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'SaveMyFamily Location Permission',
            message: 'SaveMyFamily needs access to your location to share with rescuers and family during an SOS emergency.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (fineGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }

        // For Android 10+ (API 29), background tracking requires explicit permissions
        if (Platform.Version >= 29) {
          const bgGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Location Access',
              message: 'SaveMyFamily needs background location access to query nearest volunteers and trace you even when your phone screen is locked.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          return bgGranted === PermissionsAndroid.RESULTS.GRANTED;
        }

        return true;
      } catch (err) {
        console.warn('Error requesting Android location permissions:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Fetches the current location coordinates of the phone
   */
  public getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      // Utilizes HTML5 Geolocation API which maps directly to react-native-geolocation-service
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  /**
   * Subscribes to changes in location coordinates
   */
  public watchLocation(
    onUpdate: (coords: Coordinates) => void,
    onError: (err: any) => void
  ): number {
    return navigator.geolocation.watchPosition(
      (position) => {
        onUpdate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        onError(error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 5, // Triggers callback every 5 meters moved
        interval: 3000,
        fastestInterval: 2000,
      }
    );
  }

  /**
   * Unsubscribe from coordinate watches
   */
  public clearWatch(watchId: number) {
    navigator.geolocation.clearWatch(watchId);
  }
}

export const locationService = new LocationService();
