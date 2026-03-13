import { createApp } from 'vue'
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import App from './App.vue'
import './style.css'

Chart.register(CategoryScale, LinearScale, BarController, BarElement, LineController, LineElement, PointElement, Filler, Tooltip, Legend)

createApp(App).mount('#app')
