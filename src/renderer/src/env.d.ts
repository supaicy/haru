/// <reference types="vite/client" />
import type { Api } from '../../preload'

declare global {
  interface Window {
    api: Api
  }
  // electron.vite.config.ts에서 주입하는 앱 버전
  const __APP_VERSION__: string
}
