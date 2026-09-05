import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5291,
    // host:true also binds the LAN address, which matters later for the phone.
    // On the laptop use http://localhost:5291 — browsers treat localhost as a
    // secure context even without TLS, so the camera works with no certificate.
    host: true,
    open: true,
  },
  preview: { port: 5292, host: true },
  build: {
    target: 'es2020',
    // The MediaPipe payload in public/ is large and already compressed;
    // warning about it every build is just noise.
    chunkSizeWarningLimit: 8000,
  },
});
