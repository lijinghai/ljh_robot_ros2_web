/**
 * 图层配置类型定义
 * 
 * 定义图层配置的数据结构和类型。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

export interface LayerConfig {
  id: string;
  name: string;
  topic: string | null;
  messageType: string | null;
  enabled: boolean;
  [key: string]: unknown;
}

// 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 写这段代码时，我还年轻
export interface LayerConfigMap {
  [layerId: string]: LayerConfig;
}

