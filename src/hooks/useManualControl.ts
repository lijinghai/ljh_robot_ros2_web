import { useEffect } from 'react';
import type { RosbridgeConnection } from '../utils/RosbridgeConnection';

export function useManualControl(
  manualControlMode: boolean,
  connection: RosbridgeConnection,
  cmdVelTopicRef: React.MutableRefObject<string>,
  activeKeysRef: React.MutableRefObject<Set<string>>,
  cmdVelIntervalRef: React.MutableRefObject<number | null>
) {
  useEffect(() => {
    const publishCmdVel = (linearX: number, linearY: number, angular: number) => {
      if (!connection.isConnected()) return;
      const message = {
        linear: { x: linearX, y: linearY, z: 0 },
        angular: { x: 0, y: 0, z: angular },
      };
      connection.publish(cmdVelTopicRef.current, 'geometry_msgs/Twist', message);
    };

    if (!manualControlMode) {
      if (cmdVelIntervalRef.current !== null) {
        clearInterval(cmdVelIntervalRef.current);
        cmdVelIntervalRef.current = null;
      }
      activeKeysRef.current.clear();
      publishCmdVel(0, 0, 0);
      return;
    }

    const updateCmdVel = () => {
      let linearX = 0;
      let linearY = 0;
      let angular = 0;
      const keys = activeKeysRef.current;

      // 检查所有可能的键名变体
      const hasW = keys.has('w') || keys.has('W');
      const hasS = keys.has('s') || keys.has('S');
      const hasA = keys.has('a') || keys.has('A');
      const hasD = keys.has('d') || keys.has('D');
      const hasZ = keys.has('z') || keys.has('Z');
      const hasX = keys.has('x') || keys.has('X');
      const hasUp = keys.has('ArrowUp') || keys.has('arrowup');
      const hasDown = keys.has('ArrowDown') || keys.has('arrowdown');
      const hasLeft = keys.has('ArrowLeft') || keys.has('arrowleft');
      const hasRight = keys.has('ArrowRight') || keys.has('arrowright');

      if (hasW || hasUp) {
        linearX = 0.5;
      }
      if (hasS || hasDown) {
        linearX = -0.5;
      }
      if (hasA || hasLeft) {
        angular = 0.5;
      }
      if (hasD || hasRight) {
        angular = -0.5;
      }
      if (hasZ) {
        linearY = 0.5;
      }
      if (hasX) {
        linearY = -0.5;
      }

      publishCmdVel(linearX, linearY, angular);
    };

    cmdVelIntervalRef.current = window.setInterval(updateCmdVel, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const validKeys = ['w', 'a', 's', 'd', 'z', 'x', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      
      if (!validKeys.includes(key)) {
        return;
      }

      // 如果焦点在输入框等元素上，只处理方向键（阻止默认行为），字母键不处理
      const target = e.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                             target.tagName === 'TEXTAREA' || 
                             target.isContentEditable;
      
      if (isInputElement) {
        // 方向键在输入框中也要处理（用于控制机器人），但阻止默认行为
        if (key.startsWith('arrow')) {
          e.preventDefault();
          e.stopPropagation();
        } else {
          // 字母键在输入框中不处理，让用户正常输入
          return;
        }
      } else {
        // 不在输入框中，阻止所有控制键的默认行为
        e.preventDefault();
      }
      
      // 添加所有可能的键名变体，确保能匹配
      activeKeysRef.current.add(e.key); // 原始键名
      activeKeysRef.current.add(key); // 小写
      if (key.length === 1) {
        activeKeysRef.current.add(key.toUpperCase()); // 大写（仅字母）
      }
      
      updateCmdVel();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const validKeys = ['w', 'a', 's', 'd', 'z', 'x', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      
      if (!validKeys.includes(key)) {
        return;
      }

      // 如果焦点在输入框等元素上，且是字母键，不处理
      const target = e.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                             target.tagName === 'TEXTAREA' || 
                             target.isContentEditable;
      
      if (isInputElement && !key.startsWith('arrow')) {
        return;
      }

      // 删除所有可能的键名变体
      activeKeysRef.current.delete(e.key); // 原始键名
      activeKeysRef.current.delete(key); // 小写
      if (key.length === 1) {
        activeKeysRef.current.delete(key.toUpperCase()); // 大写（仅字母）
      }
      
      if (!isInputElement) {
        e.preventDefault();
      }
      
      updateCmdVel();
    };

    // 使用捕获阶段确保事件能够被捕获
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      if (cmdVelIntervalRef.current !== null) {
        clearInterval(cmdVelIntervalRef.current);
        cmdVelIntervalRef.current = null;
      }
      activeKeysRef.current.clear();
      publishCmdVel(0, 0, 0);
    };
  }, [manualControlMode, connection, cmdVelTopicRef, activeKeysRef, cmdVelIntervalRef]);
}

