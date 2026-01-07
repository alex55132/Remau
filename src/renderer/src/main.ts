import { mount } from 'svelte'

import './assets/main.css'

import App from './App.svelte'

const target = document.getElementById('app')!

mount(App, { target })
