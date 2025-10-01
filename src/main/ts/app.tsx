import * as React from 'react'
import { createRoot } from 'react-dom/client'

import './app.scss'
import { Login } from './login'

// render root element
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Login />)
}
