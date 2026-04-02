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
    if (!navigator.geolocation) {
      reject(new Error("このブラウザは位置情報に対応していません"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(new Error(`位置情報の取得に失敗しました: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  });
}

// 距離を見やすい文字列に変換
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m先`;
  return `${(meters / 1000).toFixed(1)}km先`;
}
