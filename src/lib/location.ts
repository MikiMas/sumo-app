import * as Location from "expo-location";

export async function ensureForegroundLocationPermission() {
  const current = await Location.getForegroundPermissionsAsync();

  if (current.status === "granted") {
    return true;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === "granted";
}

export async function getCurrentPosition() {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });

  return position.coords;
}
