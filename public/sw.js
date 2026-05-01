/* global self, clients */

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: "Bamalite HR", body: event.data ? event.data.text() : "" }
  }

  const title = data.title || "Bamalite HR"
  const body = data.body || ""
  const url = data.url || "/meldingen"
  const tag = data.tag || "bamalite-hr"

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      icon: "/bemanningslijst-icon.png.png",
      badge: "/bemanningslijst-icon.png.png",
      data: { url },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl =
    (event.notification && event.notification.data && event.notification.data.url) ||
    "/meldingen"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        try {
          const winUrl = new URL(win.url)
          if (winUrl.origin === self.location.origin) {
            win.focus()
            if ("navigate" in win) {
              win.navigate(targetUrl)
            }
            return
          }
        } catch (_) {}
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
