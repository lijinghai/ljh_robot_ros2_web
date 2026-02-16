/**
 * Vite 构建配置文件
 * 
 * 配置 Vite 开发服务器、构建选项和测试环境。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 复制粘贴自 Stack Overflow
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
