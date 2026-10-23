import { mount } from 'svelte'
import './ui/tokens.css'
import './ui/base.css'
import App from './App.svelte'

const target = document.getElementById('app')
if (!target) throw new Error('Missing #app element')

const app = mount(App, { target })

export default app
