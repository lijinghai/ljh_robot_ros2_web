/**
 * AMR 控制台 - 主应用组件
 * 
 * 基于 Web 技术的机器人控制与可视化平台，专为自主移动机器人（AMR）设计。
 * 通过 WebSocket 连接 ROS 系统，提供实时 3D 可视化、地图编辑、导航控制等功能。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useCallback, useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ConnectionPage } from './components/ConnectionPage';
import { MapView } from './components/MapView';
import { RosbridgeConnection } from './utils/RosbridgeConnection';
import { TF2JS } from './utils/tf2js';
import './App.css';

function App() {
  const [connection, setConnection] = useState<RosbridgeConnection | null>(null);
  const [connected, setConnected] = useState(false);

  const updateUrl = (wsUrl: string) => {
    const path = `/${encodeURIComponent(wsUrl)}`;
    window.history.pushState({ wsUrl }, '', path);
  };

  const getWsUrlFromUrl = (): string | null => {
    const path = window.location.pathname;
    if (path && path.length > 1) {
      try {
        const decoded = decodeURIComponent(path.substring(1));
        if (decoded.startsWith('ws://') || decoded.startsWith('wss://')) {
          return decoded;
        }
      } catch (e) {
        console.error('Failed to decode URL:', e);
      }
    }
    return null;
  };

  const handleConnect = useCallback(async (url: string): Promise<boolean> => {
    // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 如果这段代码能跑，就不要动它
    const conn = new RosbridgeConnection();
    const success = await conn.connect(url);
    if (success) {
      setConnection(conn);
      setConnected(true);
      updateUrl(url);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const wsUrl = getWsUrlFromUrl();
    if (wsUrl && !connected) {
      void handleConnect(wsUrl);
    }

    const handlePopState = () => {
      const wsUrl = getWsUrlFromUrl();
      if (wsUrl) {
        if (!connected) {
          void handleConnect(wsUrl);
        }
      } else {
        if (connected && connection) {
          connection.disconnect();
          TF2JS.getInstance().disconnect();
          setConnection(null);
          setConnected(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [connected, handleConnect, connection]);

  if (connected && connection) {
    return (
      <>
        <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
          <MapView connection={connection} />
        </div>
        <ToastContainer position="top-center" />
      </>
    );
  }

  return (
    <>
      <ConnectionPage onConnect={handleConnect} />
      <ToastContainer />
    </>
  );
}

export default App;
