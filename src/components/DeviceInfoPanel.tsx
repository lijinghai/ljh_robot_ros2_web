/**
 * 设备信息面板组件
 * 
 * 实时显示机器人状态信息，包括电池、速度、位置等。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import { RosbridgeConnection } from '../utils/RosbridgeConnection';
import { TF2JS } from '../utils/tf2js';
import './DeviceInfoPanel.css';

interface DeviceInfoPanelProps {
  connection: RosbridgeConnection;
  manualControlMode?: boolean;
  currentGoal?: { x: number; y: number } | null;
  onStartNavigation?: () => void;
  onStop?: () => void;
  onEmergencyStop?: () => void;
  onRelocalize?: () => void;
}

interface RobotState {
  online: boolean;
  battery: number;
  mode: '自动' | '手动';
  linearVel: number;
  angularVel: number;
  position: { x: number; y: number; theta: number } | null;
  targetDistance: number;
  navStatus: '规划中' | '跟踪中' | '到达' | '待机';
}

export function DeviceInfoPanel({
  connection,
  manualControlMode = false,
  currentGoal = null,
  onStartNavigation,
  onStop,
  onEmergencyStop,
  onRelocalize,
}: DeviceInfoPanelProps) {
  const [robotState, setRobotState] = useState<RobotState>({
    online: false,
    battery: 100,
    mode: manualControlMode ? '手动' : '自动',
    linearVel: 0,
    angularVel: 0,
    position: null,
    targetDistance: 0,
    navStatus: '待机',
  });

  // 订阅机器人状态
  useEffect(() => {
    if (!connection.isConnected()) {
      setRobotState((prev) => ({ ...prev, online: false }));
      return;
    }

    setRobotState((prev) => ({ ...prev, online: true }));

    // 订阅里程计话题获取速度和位置
    // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 这段代码曾经工作过，现在也工作，但没人知道为什么
    try {
      connection.subscribe(
        '/odom',
        'nav_msgs/msg/Odometry',
        (message: any) => {
          // 尝试多种可能的消息结构
          let linearX = 0;
          let linearY = 0;
          let angularZ = 0;
          
          // 方法1: 标准结构 message.twist.twist
          if (message.twist?.twist) {
            linearX = message.twist.twist.linear?.x || 0;
            linearY = message.twist.twist.linear?.y || 0;
            angularZ = message.twist.twist.angular?.z || 0;
          }
          // 方法2: 直接结构 message.twist
          else if (message.twist) {
            linearX = message.twist.linear?.x || 0;
            linearY = message.twist.linear?.y || 0;
            angularZ = message.twist.angular?.z || 0;
          }
          // 方法3: 尝试从 cmd_vel 话题获取（如果 odom 没有速度信息）
          
          const linearVel = Math.sqrt(linearX * linearX + linearY * linearY);
          const angularVel = Math.abs(angularZ);

          console.log('[DeviceInfoPanel] Odometry update:', {
            linearX: linearX.toFixed(3),
            linearY: linearY.toFixed(3),
            angularZ: angularZ.toFixed(3),
            linearVel: linearVel.toFixed(3),
            angularVel: angularVel.toFixed(3),
            hasTwist: !!message.twist,
            hasTwistTwist: !!message.twist?.twist,
            messageKeys: Object.keys(message),
          });

          // 只有当 odom 的速度不为0时才更新（优先使用 odom 的真实速度）
          // 如果 odom 速度为0，则保留 cmd_vel 的速度（导航命令速度）
          if (linearVel > 0.01 || angularVel > 0.01) {
            setRobotState((prev) => ({
              ...prev,
              linearVel,
              angularVel,
            }));
          }

          if (message.pose?.pose) {
            const pos = message.pose.pose.position;
            const ori = message.pose.pose.orientation;
            
            // 将四元数转换为欧拉角
            const quaternion = new THREE.Quaternion(ori.x, ori.y, ori.z, ori.w);
            const euler = new THREE.Euler();
            euler.setFromQuaternion(quaternion, 'XYZ');
            const theta = euler.z;

            setRobotState((prev) => ({
              ...prev,
              position: {
                x: pos.x || 0,
                y: pos.y || 0,
                theta,
              },
            }));
          }
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to /odom:', error);
    }

    // 同时订阅 /cmd_vel 话题获取速度（导航时的速度命令）
    // 注意：cmd_vel 是控制器发送给机器人的速度命令，可以反映导航时的速度
    try {
      connection.subscribe(
        '/cmd_vel',
        'geometry_msgs/msg/Twist',
        (message: any) => {
          // 从 cmd_vel 获取速度（这是控制器发送给机器人的速度命令）
          const linearX = message.linear?.x || 0;
          const linearY = message.linear?.y || 0;
          const angularZ = message.angular?.z || 0;
          
          const linearVel = Math.sqrt(linearX * linearX + linearY * linearY);
          const angularVel = Math.abs(angularZ);

          console.log('[DeviceInfoPanel] CmdVel update:', {
            linearX: linearX.toFixed(3),
            linearY: linearY.toFixed(3),
            angularZ: angularZ.toFixed(3),
            linearVel: linearVel.toFixed(3),
            angularVel: angularVel.toFixed(3),
            messageKeys: Object.keys(message),
          });

          // 直接更新速度（cmd_vel 反映的是当前导航命令的速度）
          setRobotState((prev) => ({
            ...prev,
            linearVel,
            angularVel,
          }));
        }
      );
      console.log('[DeviceInfoPanel] Subscribed to /cmd_vel for velocity updates');
    } catch (error) {
      console.warn('Failed to subscribe to /cmd_vel:', error);
    }

    // 订阅电池状态
    try {
      connection.subscribe(
        '/battery_state',
        'sensor_msgs/msg/BatteryState',
        (message: any) => {
          if (message.percentage !== undefined) {
            setRobotState((prev) => ({
              ...prev,
              battery: Math.round(message.percentage * 100),
            }));
          } else if (message.voltage !== undefined) {
            const percentage = Math.min(100, Math.max(0, (message.voltage / 12.6) * 100));
            setRobotState((prev) => ({
              ...prev,
              battery: Math.round(percentage),
            }));
          }
        }
      );
    } catch (error) {
      console.warn('Battery topic not available:', error);
    }

    // 订阅导航状态
    try {
      connection.subscribe(
        '/navigate_to_pose/_action/status',
        'action_msgs/msg/GoalStatusArray',
        (message: any) => {
          if (message.status_list && message.status_list.length > 0) {
            const status = message.status_list[0]?.status;
            let navStatus: RobotState['navStatus'] = '待机';
            if (status === 1) navStatus = '规划中';
            else if (status === 2) navStatus = '跟踪中';
            else if (status === 3) navStatus = '到达';
            else if (status === 4 || status === 5) navStatus = '待机';

            setRobotState((prev) => ({
              ...prev,
              navStatus,
            }));
          }
        }
      );
    } catch (error) {
      console.warn('Navigation status topic not available:', error);
    }

    // 从TF获取位置（备用方案）
    const updatePositionFromTF = () => {
      const tf2js = TF2JS.getInstance();
      const transform = tf2js.findTransform('map', 'base_link');
      if (transform) {
        const euler = new THREE.Euler();
        euler.setFromQuaternion(transform.rotation, 'XYZ');
        setRobotState((prev) => ({
          ...prev,
          position: {
            x: transform.translation.x,
            y: transform.translation.y,
            theta: euler.z,
          },
        }));
      }
    };

    const tfInterval = setInterval(updatePositionFromTF, 500);

    return () => {
      try {
        connection.unsubscribe('/odom');
        connection.unsubscribe('/battery_state');
        connection.unsubscribe('/navigate_to_pose/_action/status');
      } catch (error) {
        // Ignore
      }
      clearInterval(tfInterval);
    };
  }, [connection]);

  // 根据手动控制模式更新模式状态
  useEffect(() => {
    setRobotState((prev) => ({
      ...prev,
      mode: manualControlMode ? '手动' : '自动',
    }));
  }, [manualControlMode]);

  // 计算目标距离
  useEffect(() => {
    if (currentGoal && robotState.position) {
      const dx = currentGoal.x - robotState.position.x;
      const dy = currentGoal.y - robotState.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setRobotState((prev) => ({
        ...prev,
        targetDistance: distance,
      }));
    } else {
      setRobotState((prev) => ({
        ...prev,
        targetDistance: 0,
      }));
    }
  }, [currentGoal, robotState.position]);

  const handleStartNavigation = () => {
    if (onStartNavigation) {
      onStartNavigation();
    } else {
      toast.info('请先设置导航目标');
    }
  };

  const handleStop = () => {
    if (!connection.isConnected()) {
      toast.error('未连接到ROS2');
      return;
    }

    try {
      // 停止运动
      connection.publish('/cmd_vel', 'geometry_msgs/msg/Twist', {
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 },
      });
      
      // 取消导航目标
      try {
        connection.publish('/navigate_to_pose/_action/cancel_goal', 'action_msgs/msg/CancelGoalRequest', {});
      } catch (error) {
        // Ignore if action not available
      }

      if (onStop) {
        onStop();
      }
      toast.success('已停止');
    } catch (error) {
      console.error('Failed to stop:', error);
      toast.error('停止失败');
    }
  };

  const handleEmergencyStop = () => {
    if (!connection.isConnected()) {
      toast.error('未连接到ROS2');
      return;
    }

    if (window.confirm('确定要执行急停吗？这将立即停止所有运动！')) {
      try {
        // 急停：立即停止所有运动
        connection.publish('/cmd_vel', 'geometry_msgs/msg/Twist', {
          linear: { x: 0, y: 0, z: 0 },
          angular: { x: 0, y: 0, z: 0 },
        });
        
        // 取消所有导航目标
        try {
          connection.publish('/navigate_to_pose/_action/cancel_goal', 'action_msgs/msg/CancelGoalRequest', {});
        } catch (error) {
          // Ignore
        }

        // 发布急停标志
        try {
          connection.publish('/robot/emergency_stop', 'std_msgs/msg/Bool', { data: true });
        } catch (error) {
          // Ignore
        }

        if (onEmergencyStop) {
          onEmergencyStop();
        }
        toast.error('已执行急停');
      } catch (error) {
        console.error('Failed to emergency stop:', error);
        toast.error('急停失败');
      }
    }
  };

  const handleRelocalize = () => {
    if (onRelocalize) {
      onRelocalize();
    } else {
      toast.info('请使用重定位功能设置初始位姿');
    }
  };

  const getBatteryColor = (battery: number): string => {
    if (battery > 60) return '#4caf50';
    if (battery > 30) return '#ff9800';
    return '#f44336';
  };

  const getNavStatusColor = (status: RobotState['navStatus']): string => {
    switch (status) {
      case '跟踪中':
        return '#2196f3';
      case '规划中':
        return '#ff9800';
      case '到达':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div className="DeviceInfoPanel">
      {/* Logo */}
      <div className="BrandLogo">
        <img src="/icon.svg" alt="Logo" className="LogoIcon" />
        <span className="BrandText">算个文科生吧</span>
      </div>

      {/* 设备图片 */}
      <div className="DeviceImageContainer">
        <img
          src="/robot_image.jpg"
          alt="机器人"
          className="DeviceImage"
          onError={(e) => {
            // 如果图片加载失败，使用占位符
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+6L+Z5piv5Lit5Zu+55qE5Zu+54mHPC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        <div className="DeviceModel">AMR-001</div>
      </div>

      {/* 设备名称和在线状态 */}
      <div className="DeviceHeader">
        <div className="DeviceName">AMR-001</div>
        <div className={`OnlineStatus ${robotState.online ? 'online' : 'offline'}`}>
          <span className="StatusDot"></span>
          {robotState.online ? '在线' : '离线'}
        </div>
      </div>

      {/* 数据列表 */}
      <div className="DataList">
        {/* 电量 */}
        <div className="DataItem">
          <div className="DataLabel">电量</div>
          <div className="DataValue">
            <div className="BatteryProgress">
              <div
                className="BatteryProgressBar"
                style={{
                  width: `${robotState.battery}%`,
                  backgroundColor: getBatteryColor(robotState.battery),
                }}
              ></div>
            </div>
            <span className="BatteryPercent">{robotState.battery}%</span>
          </div>
        </div>

        {/* 当前模式 */}
        <div className="DataItem">
          <div className="DataLabel">当前模式</div>
          <div className="DataValue">
            <span className={`ModeBadge ${robotState.mode === '自动' ? 'auto' : 'manual'}`}>
              {robotState.mode}
            </span>
          </div>
        </div>

        {/* 线速度 */}
        <div className="DataItem">
          <div className="DataLabel">线速度</div>
          <div className="DataValue">{robotState.linearVel.toFixed(2)} m/s</div>
        </div>

        {/* 角速度 */}
        <div className="DataItem">
          <div className="DataLabel">角速度</div>
          <div className="DataValue">{robotState.angularVel.toFixed(2)} rad/s</div>
        </div>

        {/* 当前位置 */}
        <div className="DataItem">
          <div className="DataLabel">当前位置</div>
          <div className="DataValue">
            {robotState.position ? (
              <>
                x: {robotState.position.x.toFixed(2)}, y: {robotState.position.y.toFixed(2)}, θ: {robotState.position.theta.toFixed(2)}
              </>
            ) : (
              '-'
            )}
          </div>
        </div>

        {/* 当前目标距离 */}
        <div className="DataItem">
          <div className="DataLabel">当前目标距离</div>
          <div className="DataValue">
            {robotState.targetDistance > 0 ? `${robotState.targetDistance.toFixed(1)}m` : '-'}
          </div>
        </div>

        {/* 导航状态 */}
        <div className="DataItem">
          <div className="DataLabel">导航状态</div>
          <div className="DataValue">
            <span
              className="NavStatusBadge"
              style={{ color: getNavStatusColor(robotState.navStatus) }}
            >
              {robotState.navStatus}
            </span>
          </div>
        </div>
      </div>

      {/* 控制按钮区 */}
      <div className="ControlSection">
        <div className="ControlRow">
          <button
            className="ControlButton StartButton"
            onClick={handleStartNavigation}
            type="button"
            title="启动导航"
          >
            <span className="ButtonIcon">▶</span>
            <span className="ButtonLabel">启动导航</span>
          </button>
          <button
            className="ControlButton StopButton"
            onClick={handleStop}
            type="button"
            title="停止"
          >
            <span className="ButtonIcon">■</span>
            <span className="ButtonLabel">停止</span>
          </button>
        </div>
        <div className="ControlRow">
          <button
            className="ControlButton RelocalizeButton"
            onClick={handleRelocalize}
            type="button"
            title="重新定位"
          >
            <span className="ButtonIcon">◎</span>
            <span className="ButtonLabel">重新定位</span>
          </button>
          <button
            className="ControlButton EmergencyButton"
            onClick={handleEmergencyStop}
            type="button"
            title="急停"
          >
            <span className="ButtonIcon">⛔</span>
            <span className="ButtonLabel">急停</span>
          </button>
        </div>
      </div>
    </div>
  );
}
