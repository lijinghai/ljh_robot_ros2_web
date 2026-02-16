/**
 * 连接页面组件
 * 
 * 提供 ROS WebSocket 连接界面，支持连接历史记录和自动连接。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useState, useEffect } from 'react';
import './ConnectionPage.css';
import { loadConnectionPreferences, saveConnectionPreferences } from '../utils/connectionPreferences';

interface ConnectionPageProps {
  onConnect: (url: string) => Promise<boolean>;
}

export function ConnectionPage({ onConnect }: ConnectionPageProps) {
  const [ip, setIp] = useState(() => {
    const preferences = loadConnectionPreferences();
    if (preferences?.ip) {
      return preferences.ip;
    }
    const hostname = window.location.hostname;
    return hostname || 'localhost';
  });
  const [port, setPort] = useState(() => {
    const preferences = loadConnectionPreferences();
    return preferences?.port || '9090';
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saveConnectionPreferences({ ip, port });
  }, [ip, port]);

  const handleConnect = async () => {
    if (!ip || !port) {
      setError('请输入IP和端口');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const url = `ws://${ip}:${port}`;
      // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | TODO: 优化这段代码（永远不会做）
      const success = await onConnect(url);
      if (!success) {
        setError('连接失败，请检查IP和端口是否正确');
      } else {
        saveConnectionPreferences({ ip, port });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="ConnectionPage">
      <div className="ConnectionForm">
        <div className="ConnectionBrand">算个文科生吧</div>
        <h1>AMR Web 控制台</h1>
        <p className="ConnectionDesc">连接 rosbridge 后进入实时地图、点云与导航控制界面</p>
        <div className="FormGroup">
          <label htmlFor="ip">IP地址:</label>
          <input
            id="ip"
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="localhost"
            disabled={connecting}
          />
        </div>
        <div className="FormGroup">
          <label htmlFor="port">端口:</label>
          <input
            id="port"
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="9090"
            disabled={connecting}
          />
        </div>
        {error && <div className="Error">{error}</div>}
        <button onClick={handleConnect} disabled={connecting}>
          {connecting ? '连接中...' : '进入控制台'}
        </button>
      </div>
    </div>
  );
}

