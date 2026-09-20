import { createRoot } from "react-dom/client"
import "../src/styles/index.css"
import "./studio.css"
import App from "./App"

const el = document.getElementById("root")
if (!el) throw new Error("missing #root")

createRoot(el).render(<App />)
