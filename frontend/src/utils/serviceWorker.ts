// src/utils/serviceWorker.ts
// filepath: serviceWorker.ts
/// <reference lib="webworker" />
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  }
};

// public/sw.js (à créer)   '/',
const CACHE_NAME = 'motivationletter-ai-v1';
const urlsToCache = [
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// filepath: serviceWorker.ts
/// <reference lib="webworker" />
// ...existing code...
self.addEventListener('install', (event) => {
  const swEvent = event as ExtendableEvent;
  swEvent.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  const fetchEvent = event as FetchEvent;
  fetchEvent.respondWith(
    caches.match(fetchEvent.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(fetchEvent.request);
      })
  );
});