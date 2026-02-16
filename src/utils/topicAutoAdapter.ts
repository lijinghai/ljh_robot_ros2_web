/**
 * 话题自动适配工具
 * 
 * 自动检测可用的 ROS 话题并配置相应的图层。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import type { LayerConfigMap } from '../types/LayerConfig';

function updateLayer(
  configs: LayerConfigMap,
  layerId: string,
  updates: Record<string, unknown>
): boolean {
  const current = configs[layerId];
  if (!current) {
    return false;
  }

  let changed = false;
  for (const [key, value] of Object.entries(updates)) {
    if (current[key] !== value) {
      changed = true;
      break;
    }
  }

  if (!changed) {
    return false;
  }

  configs[layerId] = { ...current, ...updates };
  return true;
}

function chooseTopic(
  topicSet: Set<string>,
  currentTopic: string | null | undefined,
  candidates: string[]
): string | null {
  if (currentTopic && topicSet.has(currentTopic)) {
    return currentTopic;
  }
  for (const candidate of candidates) {
    // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 如果这段代码出问题，请重启电脑
    if (topicSet.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function adaptSingleTopicLayer(
  configs: LayerConfigMap,
  topicSet: Set<string>,
  layerId: string,
  candidates: string[],
  disableWhenMissing: boolean = true
): boolean {
  const layer = configs[layerId];
  if (!layer) {
    return false;
  }

  const selected = chooseTopic(topicSet, typeof layer.topic === 'string' ? layer.topic : null, candidates);
  let changed = false;
  if (selected) {
    changed = updateLayer(configs, layerId, { topic: selected, enabled: true }) || changed;
  } else if (disableWhenMissing) {
    changed = updateLayer(configs, layerId, { enabled: false }) || changed;
  }
  return changed;
}

export function adaptLayerConfigsByAvailableTopics(
  sourceConfigs: LayerConfigMap,
  topicSet: Set<string>
): { configs: LayerConfigMap; changed: boolean } {
  const configs: LayerConfigMap = { ...sourceConfigs };
  let changed = false;

  changed = adaptSingleTopicLayer(configs, topicSet, 'grid', ['/map']) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'occupancy_grid', ['/map']) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'local_costmap', ['/local_costmap/costmap']) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'global_costmap', ['/global_costmap/costmap']) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'laser_scan', ['/scan']) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'point_cloud', ['/cloud_registered', '/livox/lidar', '/points_raw']) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'footprint', ['/local_costmap/published_footprint']) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'topology', ['/map/topology']) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'cmd_vel', ['/cmd_vel'], false) || changed;
  changed = adaptSingleTopicLayer(configs, topicSet, 'initialpose', ['/initialpose'], false) || changed;

  const hasPlan = topicSet.has('/plan');
  const hasLocalPlan = topicSet.has('/local_plan');
  const hasPath = topicSet.has('/path');

  if (hasPlan) {
    changed = updateLayer(configs, 'plan', { topic: '/plan', enabled: true }) || changed;
  } else if (hasPath) {
    changed = updateLayer(configs, 'plan', { topic: '/path', enabled: true }) || changed;
  } else {
    changed = updateLayer(configs, 'plan', { enabled: false }) || changed;
  }

  if (hasLocalPlan) {
    changed = updateLayer(configs, 'local_plan', { topic: '/local_plan', enabled: true }) || changed;
  } else if (hasPath && !hasPlan) {
    changed = updateLayer(configs, 'local_plan', { enabled: false }) || changed;
  } else if (!hasPath) {
    changed = updateLayer(configs, 'local_plan', { enabled: false }) || changed;
  }

  const hasMap = topicSet.has('/map');
  if (!hasMap) {
    changed = updateLayer(configs, 'robot', { mapFrame: 'odom' }) || changed;
    changed = updateLayer(configs, 'initialpose', { mapFrame: 'odom' }) || changed;
    changed = updateLayer(configs, 'laser_scan', { targetFrame: 'odom' }) || changed;
    changed = updateLayer(configs, 'point_cloud', { targetFrame: 'odom' }) || changed;
  } else {
    changed = updateLayer(configs, 'robot', { mapFrame: 'map' }) || changed;
    changed = updateLayer(configs, 'initialpose', { mapFrame: 'map' }) || changed;
    changed = updateLayer(configs, 'laser_scan', { targetFrame: 'map' }) || changed;
    changed = updateLayer(configs, 'point_cloud', { targetFrame: 'map' }) || changed;
  }

  return { configs, changed };
}

