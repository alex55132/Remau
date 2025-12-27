<script lang="ts">
  const versions = window.electron.process.versions
</script>

<div class="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2">
  <ul class="flex gap-4 text-xs text-gray-600">
    <li>Electron v{versions.electron}</li>
    <li>Chromium v{versions.chrome}</li>
    <li>Node v{versions.node}</li>
  </ul>
</div>
