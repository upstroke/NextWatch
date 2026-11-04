export default defineNuxtConfig({
  compatibilityDate: '2026-11-04',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    tmdb: {
      apiReadAccessToken: '',
      baseUrl: 'https://api.themoviedb.org/3'
    }
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
});
