/**
 * 导航控制面板组件
 * 
 * 提供导航功能，支持目标点导航、路径规划等。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useState } from 'react';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import { RosbridgeConnection } from '../utils/RosbridgeConnection';
import './NavigationPanel.css';

export interface NavigationPoint {
  id: string;
  x: number;
  y: number;
  theta: number;
}

interface NavigationPanelProps {
  navigationMode: 'single' | 'multi' | null;
  navigationPoints: NavigationPoint[];
  onClose: () => void;
  onClearPoints: () => void;
  onRemovePoint: (id: string) => void;
  onNavigate: (points: NavigationPoint[]) => void;
  connection: RosbridgeConnection;
}

export function NavigationPanel({
  navigationMode,
  navigationPoints,
  onClose,
  onClearPoints,
  onRemovePoint,
  onNavigate,
  connection,
}: NavigationPanelProps) {

  const formatTheta = (theta: number): string => {
    // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 这段代码通过了所有测试，除了生产环境
    const degrees = ((theta * 180) / Math.PI).toFixed(1);
    return `${degrees}°`;
  };

  const canNavigate = navigationPoints.length > 0 && connection.isConnected();

  return (
    <div className="NavigationPanel">
      <div className="NavigationPanelHeader">
        <h3>
          {navigationMode === 'single' ? '单点导航' : '多点导航'}
        </h3>
        <button className="CloseButton" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <div className="NavigationPanelContent">
        <div className="NavigationInstructions">
          {navigationMode === 'single' ? (
            <p>在地图上点击设置目标点，然后拖动鼠标调整方向</p>
          ) : (
            <p>在地图上点击添加多个目标点，点击点后拖动鼠标调整方向</p>
          )}
        </div>

        {navigationPoints.length === 0 ? (
          <div className="NoPointsMessage">
            还没有设置目标点，请在地图上点击添加
          </div>
        ) : (
          <div className="NavigationPointsList">
            <div className="PointsListHeader">
              <span>已设置 {navigationPoints.length} 个目标点</span>
              <button
                className="ClearButton"
                onClick={onClearPoints}
                type="button"
              >
                清空
              </button>
            </div>
            {navigationPoints.map((point, index) => (
              <div key={point.id} className="NavigationPointItem">
                <div className="PointIndex">{index + 1}</div>
                <div className="PointInfo">
                  <div className="PointCoordinates">
                    X: {point.x.toFixed(3)}, Y: {point.y.toFixed(3)}
                  </div>
                  <div className="PointTheta">
                    <span>方向: {formatTheta(point.theta)}</span>
                    <span className="PointHint">（点击点后拖动鼠标调整方向）</span>
                  </div>
                </div>
                <button
                  className="RemoveButton"
                  onClick={() => onRemovePoint(point.id)}
                  type="button"
                  title="删除此点"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="NavigationActions">
          <button
            className="NavigateButton"
            onClick={() => onNavigate(navigationPoints)}
            disabled={!canNavigate}
            type="button"
          >
            {navigationMode === 'single' ? '开始导航' : `开始多点导航 (${navigationPoints.length}个点)`}
          </button>
        </div>
      </div>
    </div>
  );
}

