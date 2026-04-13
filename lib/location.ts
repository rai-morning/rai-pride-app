// Haversine公式で2点間の距離をメートルで返す
export function calcDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 地球半径(m)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ブラウザのGeolocation APIで現在地を取得
export function getCurrentPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error("位置情報はHTTPS接続でのみ利用できます"));
      return;
    }

    if (!navigator.geolocation) {
      reject(new Error("このブラウザは位置情報に対応していません"));
      return;
    }

    const attempts: PositionOptions[] = [
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      // 省電力/おおまかな位置でも良い設定で再試行
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    ];

    const mapErrorMessage = (err: GeolocationPositionError) => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          return "位置情報の許可がオフです。ブラウザ設定からこのサイトの位置情報を許可してください";
        case err.POSITION_UNAVAILABLE:
          return "現在地を特定できませんでした。GPS/Wi-Fi/モバイル通信をONにして再試行してください";
        case err.TIMEOUT:
          return "位置情報の取得がタイムアウトしました。電波の良い場所で再試行してください";
        default:
          return `位置情報の取得に失敗しました: ${err.message}`;
      }
    };

    const tryAt = (index: number) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => {
          const isLastAttempt = index >= attempts.length - 1;
          const shouldRetry =
            !isLastAttempt &&
            err.code !== err.PERMISSION_DENIED;

          if (shouldRetry) {
            tryAt(index + 1);
            return;
          }

          reject(new Error(mapErrorMessage(err)));
        },
        attempts[index]
      );
    };

    tryAt(0);
  });
}

export async function getLocationPermissionState(): Promise<PermissionState | "unsupported"> {
  if (!navigator.permissions?.query) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unsupported";
  }
}

// 距離を見やすい文字列に変換
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m先`;
  return `${(meters / 1000).toFixed(1)}km先`;
}
