/**
 * AMR 控制台 - 应用入口文件
 * 
 * 应用程序的入口点，负责初始化 React 应用并挂载到 DOM。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 写这段代码时，我还年轻
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
