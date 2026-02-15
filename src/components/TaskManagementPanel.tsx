import { useEffect, useState } from 'react';
import { RosbridgeConnection } from '../utils/RosbridgeConnection';
import type { NavigationPoint } from './NavigationPanel';
import './TaskManagementPanel.css';

interface TaskManagementPanelProps {
  connection: RosbridgeConnection;
  navigationPoints: NavigationPoint[];
  onRemoveTask?: (id: string) => void;
  onReorderTasks?: (fromIndex: number, toIndex: number) => void;
}

interface TaskItem {
  id: string;
  point: NavigationPoint;
  status: '等待' | '进行中' | '已完成';
}

interface SystemStatus {
  globalPlanner: 'OK' | 'Error' | 'Unknown';
  localPlanner: 'Running' | 'Idle' | 'Error' | 'Unknown';
  controller: 'Tracking' | 'Idle' | 'Error' | 'Unknown';
  costmap: 'Updating' | 'Idle' | 'Error' | 'Unknown';
}

export function TaskManagementPanel({
  connection,
  navigationPoints,
  onRemoveTask,
  onReorderTasks,
}: TaskManagementPanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    globalPlanner: 'Unknown',
    localPlanner: 'Unknown',
    controller: 'Unknown',
    costmap: 'Unknown',
  });

  // 将导航点转换为任务
  useEffect(() => {
    const newTasks: TaskItem[] = navigationPoints.map((point, index) => {
      const existingTask = tasks.find((t) => t.id === point.id);
      return {
        id: point.id,
        point,
        status: existingTask?.status || (index === 0 ? '进行中' : '等待'),
      };
    });

    // 更新已完成的任务状态
    setTasks((prevTasks) => {
      return newTasks.map((newTask) => {
        const prevTask = prevTasks.find((t) => t.id === newTask.id);
        if (prevTask && prevTask.status === '已完成') {
          return prevTask;
        }
        return newTask;
      });
    });
  }, [navigationPoints]);

  // 订阅系统状态
  useEffect(() => {
    if (!connection.isConnected()) return;

    // 订阅导航状态来更新任务状态
    try {
      connection.subscribe(
        '/navigate_to_pose/_action/status',
        'action_msgs/msg/GoalStatusArray',
        (message: any) => {
          if (message.status_list && message.status_list.length > 0) {
            const status = message.status_list[0]?.status;
            // status: 0=IDLE, 1=IN_PROGRESS, 2=SUCCEEDED, 3=CANCELED, 4=ABORTED
            if (status === 2) {
              // 任务完成，更新第一个进行中的任务为已完成
              setTasks((prev) => {
                const updated = [...prev];
                const inProgressIndex = updated.findIndex((t) => t.status === '进行中');
                if (inProgressIndex >= 0) {
                  updated[inProgressIndex] = { ...updated[inProgressIndex]!, status: '已完成' };
                  // 启动下一个等待中的任务
                  const nextWaitingIndex = updated.findIndex((t) => t.status === '等待');
                  if (nextWaitingIndex >= 0) {
                    updated[nextWaitingIndex] = { ...updated[nextWaitingIndex]!, status: '进行中' };
                  }
                }
                return updated;
              });
            }
          }
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to navigation status:', error);
    }

    // 订阅规划器状态
    const updateSystemStatus = () => {
      // 这里可以从ROS2话题获取实际状态
      // 暂时使用模拟数据
      setSystemStatus({
        globalPlanner: 'OK',
        localPlanner: 'Running',
        controller: 'Tracking',
        costmap: 'Updating',
      });
    };

    updateSystemStatus();
    const statusInterval = setInterval(updateSystemStatus, 2000);

    return () => {
      try {
        connection.unsubscribe('/navigate_to_pose/_action/status');
      } catch (error) {
        // Ignore
      }
      clearInterval(statusInterval);
    };
  }, [connection]);

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (onRemoveTask) {
      onRemoveTask(id);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0 && onReorderTasks) {
      onReorderTasks(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < tasks.length - 1 && onReorderTasks) {
      onReorderTasks(index, index + 1);
    }
  };

  const getStatusColor = (status: TaskItem['status']): string => {
    switch (status) {
      case '进行中':
        return '#2196f3';
      case '已完成':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusIcon = (status: TaskItem['status']): string => {
    switch (status) {
      case '已完成':
        return '✓';
      case '进行中':
        return '▶';
      default:
        return '○';
    }
  };

  // 如果隐藏，显示一个小的展开按钮
  if (!isVisible) {
    return (
      <button
        className="TaskPanelToggleButton"
        onClick={() => setIsVisible(true)}
        type="button"
        title="显示任务队列"
      >
        <span className="ToggleIcon">◀</span>
        <span className="ToggleLabel">任务</span>
      </button>
    );
  }

  return (
    <div className="TaskManagementPanel">
      {/* 标题栏，包含隐藏按钮 */}
      <div className="PanelHeader">
        <div className="SectionTitle">任务队列</div>
        <button
          className="HideButton"
          onClick={() => setIsVisible(false)}
          type="button"
          title="隐藏任务队列"
        >
          ▶
        </button>
      </div>
      {/* 任务队列区 */}
      <div className="TaskQueueSection">
        {tasks.length === 0 ? (
          <div className="EmptyTasks">暂无任务</div>
        ) : (
          <div className="TaskList">
            {tasks.map((task, index) => (
              <div key={task.id} className="TaskItem">
                <div className="TaskNumber">{index + 1}️⃣</div>
                <div className="TaskInfo">
                  <div className="TaskPointName">
                    点 {String.fromCharCode(65 + index)} ({task.point.x.toFixed(1)}, {task.point.y.toFixed(1)})
                  </div>
                  <div
                    className="TaskStatus"
                    style={{ color: getStatusColor(task.status) }}
                  >
                    {getStatusIcon(task.status)} {task.status}
                  </div>
                </div>
                <div className="TaskActions">
                  {index > 0 && (
                    <button
                      className="TaskActionButton"
                      onClick={() => handleMoveUp(index)}
                      type="button"
                      title="上移"
                    >
                      ↑
                    </button>
                  )}
                  {index < tasks.length - 1 && (
                    <button
                      className="TaskActionButton"
                      onClick={() => handleMoveDown(index)}
                      type="button"
                      title="下移"
                    >
                      ↓
                    </button>
                  )}
                  <button
                    className="TaskActionButton DeleteButton"
                    onClick={() => handleRemoveTask(task.id)}
                    type="button"
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 运行状态区 */}
      <div className="SystemStatusSection">
        <div className="SectionTitle">运行状态</div>
        <div className="StatusList">
          <div className="StatusItem">
            <div className="StatusLabel">Global Planner</div>
            <div
              className="StatusValue"
              style={{
                color:
                  systemStatus.globalPlanner === 'OK'
                    ? '#4caf50'
                    : systemStatus.globalPlanner === 'Error'
                    ? '#f44336'
                    : '#9e9e9e',
              }}
            >
              {systemStatus.globalPlanner}
            </div>
          </div>
          <div className="StatusItem">
            <div className="StatusLabel">Local Planner</div>
            <div
              className="StatusValue"
              style={{
                color:
                  systemStatus.localPlanner === 'Running'
                    ? '#2196f3'
                    : systemStatus.localPlanner === 'Error'
                    ? '#f44336'
                    : '#9e9e9e',
              }}
            >
              {systemStatus.localPlanner}
            </div>
          </div>
          <div className="StatusItem">
            <div className="StatusLabel">Controller</div>
            <div
              className="StatusValue"
              style={{
                color:
                  systemStatus.controller === 'Tracking'
                    ? '#2196f3'
                    : systemStatus.controller === 'Error'
                    ? '#f44336'
                    : '#9e9e9e',
              }}
            >
              {systemStatus.controller}
            </div>
          </div>
          <div className="StatusItem">
            <div className="StatusLabel">Costmap</div>
            <div
              className="StatusValue"
              style={{
                color:
                  systemStatus.costmap === 'Updating'
                    ? '#2196f3'
                    : systemStatus.costmap === 'Error'
                    ? '#f44336'
                    : '#9e9e9e',
              }}
            >
              {systemStatus.costmap}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

