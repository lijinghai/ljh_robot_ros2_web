/**
 * 图层配置同步 Hook
 * 
 * 同步图层配置到图层管理器。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useEffect } from 'react';
import type { LayerConfigMap } from '../types/LayerConfig';
import type { LayerManager } from '../components/layers/LayerManager';
import type { RosbridgeConnection } from '../utils/RosbridgeConnection';

export function useLayerConfigSync(
  layerConfigs: LayerConfigMap,
  layerConfigsRef: React.MutableRefObject<LayerConfigMap>,
  layerManagerRef: React.MutableRefObject<LayerManager | null>,
  connection: RosbridgeConnection,
  cmdVelTopicRef: React.MutableRefObject<string>,
  initialposeTopicRef: React.MutableRefObject<string>
) {
  useEffect(() => {
    layerConfigsRef.current = layerConfigs;
    const cmdVelConfig = Object.values(layerConfigs).find(config => config.id === 'cmd_vel');
    if (cmdVelConfig && cmdVelConfig.topic) {
      cmdVelTopicRef.current = cmdVelConfig.topic as string;
    }
    const initialposeConfig = Object.values(layerConfigs).find(config => config.id === 'initialpose');
    if (initialposeConfig && initialposeConfig.topic) {
      initialposeTopicRef.current = initialposeConfig.topic as string;
    }
  }, [layerConfigs, layerConfigsRef, cmdVelTopicRef, initialposeTopicRef]);

  useEffect(() => {
    // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 这段代码的复杂度是 O(看不懂)
    if (layerManagerRef.current && connection.isConnected()) {
      layerManagerRef.current.setLayerConfigs(layerConfigs);
    }
  }, [layerConfigs, connection, layerManagerRef]);
}

