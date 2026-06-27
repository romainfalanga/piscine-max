export function renderApp(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Piscine Max — Gestion d'entretien</title>
  <meta name="theme-color" content="#0891b2">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <link href="/static/style.css" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: { extend: { colors: { brand: { DEFAULT: '#0891b2', dark: '#0e7490', light: '#06b6d4' } } } }
    }
  </script>
</head>
<body class="bg-slate-100 text-slate-800 antialiased">
  <div id="app"></div>
  <div id="modal-root"></div>
  <div id="toast-root" class="fixed top-4 right-4 z-[9999] space-y-2"></div>
  <script src="/static/views-clients.js"></script>
  <script src="/static/views-pools.js"></script>
  <script src="/static/views-agenda.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>`
}
