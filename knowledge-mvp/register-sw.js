if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const isLocalhost =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (isLocalhost) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      return;
    }
    navigator.serviceWorker.register("./sw.js");
  });
}
