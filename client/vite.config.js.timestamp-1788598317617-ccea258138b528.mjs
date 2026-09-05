// vite.config.js
import { defineConfig } from "file:///C:/Users/PREETHAM/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/Desktop/Razor-Pay-Project/client/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/PREETHAM/OneDrive/%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88/Desktop/Razor-Pay-Project/client/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/disputes": "http://localhost:3000",
      "/webhooks": "http://localhost:3000",
      "/health": "http://localhost:3000"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxQUkVFVEhBTVxcXFxPbmVEcml2ZVxcXFxcdTMwQzlcdTMwQURcdTMwRTVcdTMwRTFcdTMwRjNcdTMwQzhcXFxcRGVza3RvcFxcXFxSYXpvci1QYXktUHJvamVjdFxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFBSRUVUSEFNXFxcXE9uZURyaXZlXFxcXFx1MzBDOVx1MzBBRFx1MzBFNVx1MzBFMVx1MzBGM1x1MzBDOFxcXFxEZXNrdG9wXFxcXFJhem9yLVBheS1Qcm9qZWN0XFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvUFJFRVRIQU0vT25lRHJpdmUvJUUzJTgzJTg5JUUzJTgyJUFEJUUzJTgzJUE1JUUzJTgzJUExJUUzJTgzJUIzJUUzJTgzJTg4L0Rlc2t0b3AvUmF6b3ItUGF5LVByb2plY3QvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgICcvZGlzcHV0ZXMnOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICcvd2ViaG9va3MnOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICcvaGVhbHRoJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCdcbiAgICB9XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3YixTQUFTLG9CQUFvQjtBQUNyZCxPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLGFBQWE7QUFBQSxNQUNiLGFBQWE7QUFBQSxNQUNiLFdBQVc7QUFBQSxJQUNiO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
