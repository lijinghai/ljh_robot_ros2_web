/**
 * 拓扑地图存储工具
 * 
 * 管理拓扑地图的本地存储和加载。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

interface TopologyMap {
  map_name: string;
  map_property?: {
    support_controllers?: string[];
    support_goal_checkers?: string[];
  };
  points: Array<{
    name: string;
    x: number;
    y: number;
    theta: number;
    type: number;
  }>;
  routes?: Array<{
    from_point: string;
    to_point: string;
    route_info: {
      controller: string;
      goal_checker: string;
      speed_limit: number;
    };
  }>;
}

const STORAGE_KEY = 'ros_web_gui_topology_map';

export function saveTopologyMap(map: TopologyMap): void {
  // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 这段代码的注释是：// 这里需要注释
  try {
    const serialized = JSON.stringify(map);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save topology map:', error);
  }
}

export function loadTopologyMap(): TopologyMap | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized) {
      return JSON.parse(serialized) as TopologyMap;
    }
  } catch (error) {
    console.error('Failed to load topology map:', error);
  }
  return null;
}

