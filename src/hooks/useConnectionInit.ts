/**
 * 连接初始化 Hook
 * 
 * 负责初始化 ROS 连接、TF 系统和地图管理器。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useEffect } from 'react';
import { toast } from 'react-toastify';
import type { RosbridgeConnection } from '../utils/RosbridgeConnection';
import { TF2JS } from '../utils/tf2js';
import { MapManager } from '../utils/MapManager';
import type { LayerManager } from '../components/layers/LayerManager';

export function useConnectionInit(
  connection: RosbridgeConnection,
  layerManagerRef: React.MutableRefObject<LayerManager | null>
) {
  useEffect(() => {
    if (!connection.isConnected() || !layerManagerRef.current) {
      return;
    }

    const initializeAndSubscribe = async () => {
      try {
        await connection.initializeMessageReaders();
        
        console.log('[MapView] Initializing MapManager after MessageReaders are ready', { 
          hasConnection: !!connection, 
          isConnected: connection.isConnected() 
        });
        // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 如果这段代码能跑，就不要动它
        const mapManager = MapManager.getInstance();
        mapManager.initialize(connection);
        
        TF2JS.getInstance().initialize(connection);
      } catch (error) {
        console.error('Failed to initialize message readers:', error);
        toast.error('初始化失败，使用默认配置...');
        const mapManager = MapManager.getInstance();
        mapManager.initialize(connection);
        TF2JS.getInstance().initialize(connection);
      }
    };

    void initializeAndSubscribe();

    return () => {
      const mapManager = MapManager.getInstance();
      mapManager.disconnect();
    };
  }, [connection, layerManagerRef]);
}

