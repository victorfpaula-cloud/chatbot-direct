// Service worker só pra notificações push da tela de reservas — sem cache, sem funcionar offline
// de propósito (o app precisa sempre dos dados mais recentes do servidor).

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (erro) {
    // corpo não era JSON — segue com os valores padrão abaixo em vez de falhar a notificação toda.
  }

  const titulo = dados.titulo || "Nova reserva";
  const opcoes = {
    body: dados.corpo || "",
    icon: "/reservas/icon.png",
    badge: "/reservas/icon.png",
    data: { url: dados.url || "/reservas" },
  };

  const tarefas = [self.registration.showNotification(titulo, opcoes)];

  if (typeof dados.badge === "number" && "setAppBadge" in navigator) {
    tarefas.push(navigator.setAppBadge(dados.badge).catch(() => {}));
  }

  event.waitUntil(Promise.all(tarefas));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/reservas";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes(url) && "focus" in cliente) return cliente.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
