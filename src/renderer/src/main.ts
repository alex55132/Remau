import { mount } from 'svelte'

import './assets/main.css'

import App from './App.svelte'

// Detectar el modo desde la URL
const urlParams = new URLSearchParams(window.location.search)
const mode = urlParams.get('mode') || 'sender'

const target = document.getElementById('app')!
/*
if (mode === 'receiver') {
  mount(Receiver, { target })
} else if (mode === 'settings') {
  mount(DriverSetup, { target })
} else {
  mount(App, { target })
} */
mount(App, { target })
