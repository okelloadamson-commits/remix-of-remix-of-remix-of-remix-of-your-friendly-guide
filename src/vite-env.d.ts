/// <reference types="vite/client" />

declare const __BUILD_ID__: string;

declare module "*.mp3" {
  const src: string;
  export default src;
}
