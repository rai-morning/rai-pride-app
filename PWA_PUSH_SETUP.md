# PWA + Push Notification Setup

本機能を有効化するには、Vercel 環境変数に以下を設定してください。

## Client (NEXT_PUBLIC)

- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
  - Firebase Console > Cloud Messaging > Web Push certificates の公開鍵

## Server (firebase-admin)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
  - 改行は `\n` のまま文字列で設定

## Notes

- iOS はホーム画面に追加した PWA で通知/バッジが機能します。
- 反映後は `firestore.rules` も再デプロイしてください。
