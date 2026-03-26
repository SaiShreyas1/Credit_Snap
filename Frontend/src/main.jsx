import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { checkServerBaseUrl } from './config.js'

checkServerBaseUrl().then(() => {
  import('./App.jsx').then(({ default: App }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
})
