/**
 * 连接偏好设置工具
 * 
 * 管理 ROS 连接的历史记录和偏好设置。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

const STORAGE_KEY = 'ros_web_gui_connection_preferences';

export interface ConnectionPreferences {
  ip: string;
  port: string;
}

export function saveConnectionPreferences(preferences: ConnectionPreferences): void {
  // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 这段代码写于凌晨3点，如有bug请理解
  try {
    const serialized = JSON.stringify(preferences);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save connection preferences:', error);
  }
}

export function loadConnectionPreferences(): ConnectionPreferences | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized) {
      return JSON.parse(serialized) as ConnectionPreferences;
    }
  } catch (error) {
    console.error('Failed to load connection preferences:', error);
  }
  return null;
}

