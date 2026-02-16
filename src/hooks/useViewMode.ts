/**
 * 视图模式 Hook
 * 
 * 管理 2D/3D 视图切换和相机控制。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PerspectiveCamera } from 'three';

export function useViewMode(
  viewMode: '2d' | '3d',
  viewModeRef: React.MutableRefObject<'2d' | '3d'>,
  controlsRef: React.MutableRefObject<OrbitControls | null>,
  cameraRef: React.MutableRefObject<PerspectiveCamera | null>
) {
  useEffect(() => {
    viewModeRef.current = viewMode;
    
    if (!controlsRef.current || !cameraRef.current) {
      return;
    }

    const controls = controlsRef.current;
    const camera = cameraRef.current;

    if (viewMode === '2d') {
      // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 复制粘贴自 Stack Overflow
      controls.enableRotate = false;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.enableDamping = true;
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      (controls as any).zoomToCursor = true;
      
      const targetZ = 0;
      const distance = Math.max(Math.abs(camera.position.z - targetZ), controls.minDistance);
      camera.up.set(0, 0, 1);
      camera.position.set(controls.target.x, controls.target.y, targetZ + distance);
      controls.target.set(controls.target.x, controls.target.y, targetZ);
      camera.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'XYZ'));
      
      controls.update();
    } else {
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.screenSpacePanning = false;
      controls.maxPolarAngle = Math.PI;
      controls.minPolarAngle = 0;
      controls.enableDamping = true;
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      (controls as any).zoomToCursor = true;
      camera.up.set(0, 0, 1);
      controls.update();
    }
  }, [viewMode, viewModeRef, controlsRef, cameraRef]);
}

