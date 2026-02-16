/**
 * 导航模式 Hook
 * 
 * 管理导航模式下的交互逻辑，包括目标点设置和路径规划。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { LayerConfigMap } from '../types/LayerConfig';
import type { LayerManager } from '../components/layers/LayerManager';
import type { NavigationPoint } from '../components/NavigationPanel';

export function useNavigationMode(
  navigationMode: 'single' | 'multi' | null,
  navigationModeRef: React.MutableRefObject<'single' | 'multi' | null>,
  navigationPoints: NavigationPoint[],
  setNavigationPoints: React.Dispatch<React.SetStateAction<NavigationPoint[]>>,
  layerConfigsRef: React.MutableRefObject<LayerConfigMap>,
  layerManagerRef: React.MutableRefObject<LayerManager | null>,
  controlsRef: React.MutableRefObject<OrbitControls | null>,
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>,
  sceneRef: React.MutableRefObject<THREE.Scene | null>
) {
  const currentPointRef = useRef<{ x: number; y: number; theta: number } | null>(null);
  const isDraggingPointRef = useRef(false);
  const isRotatingPointRef = useRef(false);
  const pointMarkerRef = useRef<THREE.Group | null>(null);
  const pointDirectionRef = useRef<THREE.ArrowHelper | null>(null);
  const pointMarkersRef = useRef<Map<string, THREE.Group>>(new Map());

  useEffect(() => {
    navigationModeRef.current = navigationMode;
  }, [navigationMode, navigationModeRef]);

  // 创建点标记可视化
  useEffect(() => {
    if (!sceneRef.current) return;

    // 创建点标记组
    const markerGroup = new THREE.Group();
    markerGroup.visible = false;
    sceneRef.current.add(markerGroup);
    pointMarkerRef.current = markerGroup;

    // 创建点标记（球体）
    const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x2196f3,
      transparent: true,
      opacity: 0.8,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.z = 0.1;
    markerGroup.add(sphere);

    // 创建方向箭头
    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0.1),
      0.5,
      0x2196f3,
      0.15,
      0.1
    );
    markerGroup.add(arrowHelper);
    pointDirectionRef.current = arrowHelper;

    return () => {
      if (sceneRef.current && markerGroup) {
        sceneRef.current.remove(markerGroup);
        sphereGeometry.dispose();
        sphereMaterial.dispose();
      }
    };
  }, [sceneRef]);

  // 为所有导航点创建可视化标记
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const markers = pointMarkersRef.current;

    // 移除不再存在的点的标记
    const existingIds = new Set(navigationPoints.map(p => p.id));
    for (const [id, marker] of markers.entries()) {
      if (!existingIds.has(id)) {
        scene.remove(marker);
        // 清理所有子对象
        marker.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            (child.geometry as THREE.BufferGeometry).dispose();
            const material = child.material as THREE.Material;
            if (Array.isArray(material)) {
              material.forEach(m => m.dispose());
            } else {
              material.dispose();
            }
          }
        });
        markers.delete(id);
      }
    }
    // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | TODO: 优化这段代码（永远不会做）
    // 为每个导航点创建或更新标记
    navigationPoints.forEach((point) => {
      let marker = markers.get(point.id);
      
      if (!marker) {
        // 创建新标记
        marker = new THREE.Group();
        marker.userData.isNavigationPoint = true;
        marker.userData.pointId = point.id;

        // 创建点标记（球体）- 增大尺寸以便更容易看到
        const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({
          color: 0x2196f3,
          transparent: true,
          opacity: 0.9,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.z = 0.2;
        marker.add(sphere);

        // 创建方向箭头 - 增大尺寸
        const arrowHelper = new THREE.ArrowHelper(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 0, 0.2),
          0.8,
          0x2196f3,
          0.2,
          0.15
        );
        marker.add(arrowHelper);
        
        console.log('[useNavigationMode] Created marker for point:', point.id, 'at', point.x, point.y);

        scene.add(marker);
        markers.set(point.id, marker);
      }

      // 更新位置
      marker.position.set(point.x, point.y, 0);
      marker.visible = true;

      // 更新方向箭头
      const arrow = marker.children.find(child => child instanceof THREE.ArrowHelper) as THREE.ArrowHelper | undefined;
      if (arrow) {
        const direction = new THREE.Vector3(
          Math.cos(point.theta),
          Math.sin(point.theta),
          0
        );
        arrow.setDirection(direction);
        arrow.visible = true;
      }
      
      console.log('[useNavigationMode] Updated marker for point:', point.id, 'at', point.x, point.y, 'theta:', point.theta);
    });

    // 注意：清理函数只在组件卸载时执行，不在每次 navigationPoints 变化时执行
  }, [navigationPoints, sceneRef]);

  // 组件卸载时清理所有标记
  useEffect(() => {
    return () => {
      if (!sceneRef.current) return;
      const markers = pointMarkersRef.current;
      for (const [id, marker] of markers.entries()) {
        sceneRef.current.remove(marker);
        marker.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            (child.geometry as THREE.BufferGeometry).dispose();
            ((child.material as THREE.Material)).dispose();
          }
        });
      }
      markers.clear();
    };
  }, [sceneRef]);

  // 更新当前正在设置的点标记位置和方向
  useEffect(() => {
    if (!pointMarkerRef.current || !pointDirectionRef.current) return;

    if (currentPointRef.current && navigationMode) {
      pointMarkerRef.current.visible = true;
      pointMarkerRef.current.position.set(
        currentPointRef.current.x,
        currentPointRef.current.y,
        0
      );

      // 更新方向箭头
      const direction = new THREE.Vector3(
        Math.cos(currentPointRef.current.theta),
        Math.sin(currentPointRef.current.theta),
        0
      );
      pointDirectionRef.current.setDirection(direction);
    } else {
      pointMarkerRef.current.visible = false;
    }
  }, [navigationMode, navigationPoints]);

  // 处理地图点击和拖拽
  useEffect(() => {
    if (!navigationMode || !canvasRef.current || !cameraRef.current || !sceneRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;

    const handleClick = (event: MouseEvent) => {
      if (!navigationModeRef.current || !raycasterRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersectPoint = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(plane, intersectPoint);

      // 检查是否点击了已存在的点
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj) {
          if (obj.userData.isNavigationPoint) {
            // 点击了已存在的点，开始调整方向
            const pointId = obj.userData.pointId;
            const existingPoint = navigationPoints.find(p => p.id === pointId);
            if (existingPoint) {
              currentPointRef.current = { x: existingPoint.x, y: existingPoint.y, theta: existingPoint.theta };
              isRotatingPointRef.current = true;
              console.log('[useNavigationMode] Clicked existing point, starting rotation:', pointId);
            }
            return;
          }
          obj = obj.parent as THREE.Object3D;
        }
      }

      // 创建新点
      const newPoint: NavigationPoint = {
        id: `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        x: intersectPoint.x,
        y: intersectPoint.y,
        theta: 0,
      };

      console.log('[useNavigationMode] Creating new navigation point:', newPoint);

      if (navigationModeRef.current === 'single') {
        // 单点模式：替换现有点
        setNavigationPoints([newPoint]);
        currentPointRef.current = { x: newPoint.x, y: newPoint.y, theta: newPoint.theta };
        isRotatingPointRef.current = true; // 创建点后立即可以调整方向
        console.log('[useNavigationMode] Single point mode: set point', newPoint);
      } else if (navigationModeRef.current === 'multi') {
        // 多点模式：添加新点
        setNavigationPoints((prev) => {
          const updated = [...prev, newPoint];
          currentPointRef.current = { x: newPoint.x, y: newPoint.y, theta: newPoint.theta };
          isRotatingPointRef.current = true; // 创建点后立即可以调整方向
          console.log('[useNavigationMode] Multi point mode: added point', newPoint, 'total:', updated.length);
          return updated;
        });
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!navigationModeRef.current || !raycasterRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouse, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);

      for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj) {
          if (obj.userData.isNavigationPoint) {
            const pointId = obj.userData.pointId;
            const existingPoint = navigationPoints.find(p => p.id === pointId);
            if (existingPoint) {
              if (event.button === 0) {
                // 左键：开始拖拽移动点位置
                isDraggingPointRef.current = true;
                currentPointRef.current = { x: existingPoint.x, y: existingPoint.y, theta: existingPoint.theta };
              } else if (event.button === 2) {
                // 右键：开始调整方向
                isRotatingPointRef.current = true;
                currentPointRef.current = { x: existingPoint.x, y: existingPoint.y, theta: existingPoint.theta };
              }
            }
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          obj = obj.parent as THREE.Object3D;
        }
      }

    };

    const handleMouseUp = () => {
      isDraggingPointRef.current = false;
      isRotatingPointRef.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!navigationModeRef.current || !raycasterRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersectPoint = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(plane, intersectPoint);

      // 如果正在调整方向（拖动鼠标）- 左键拖动
      if (isRotatingPointRef.current && currentPointRef.current && (event.buttons === 1 || event.buttons === 0)) {
        const dx = intersectPoint.x - currentPointRef.current.x;
        const dy = intersectPoint.y - currentPointRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 只有当鼠标移动了一定距离时才更新方向，避免抖动
        if (distance > 0.1) {
          const newTheta = Math.atan2(dy, dx);
          currentPointRef.current.theta = newTheta;

          // 更新对应的导航点
          if (navigationModeRef.current === 'single') {
            setNavigationPoints((prev) => {
              if (prev.length > 0) {
                const updated = [{ ...prev[0]!, theta: newTheta }];
                return updated;
              }
              return prev;
            });
          } else if (navigationModeRef.current === 'multi') {
            // 找到当前正在调整的点
            setNavigationPoints((prev) => {
              const currentPointId = currentPointRef.current ? 
                prev.find(p => Math.abs(p.x - currentPointRef.current!.x) < 0.01 && 
                              Math.abs(p.y - currentPointRef.current!.y) < 0.01)?.id : null;
              
              if (currentPointId) {
                return prev.map(p => p.id === currentPointId ? { ...p, theta: newTheta } : p);
              } else if (prev.length > 0) {
                // 如果没有找到，更新最后一个点
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1]!,
                  theta: newTheta,
                };
                return updated;
              }
              return prev;
            });
          }
        }
      } else if (isDraggingPointRef.current && currentPointRef.current) {
        // 拖拽移动点位置
        currentPointRef.current.x = intersectPoint.x;
        currentPointRef.current.y = intersectPoint.y;

        // 更新对应的导航点
        if (navigationModeRef.current === 'single') {
          setNavigationPoints((prev) => {
            if (prev.length > 0) {
              const updated = [{ ...prev[0]!, x: intersectPoint.x, y: intersectPoint.y }];
              return updated;
            }
            return prev;
          });
        } else if (navigationModeRef.current === 'multi') {
          // 多点模式：更新最后一个点
          setNavigationPoints((prev) => {
            if (prev.length > 0) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1]!,
                x: intersectPoint.x,
                y: intersectPoint.y,
              };
              return updated;
            }
            return prev;
          });
        }
      }
    };


    const handleContextMenu = (event: MouseEvent) => {
      if (navigationModeRef.current) {
        event.preventDefault();
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('mousemove', handleMouseMove);

    // 更新控制器的交互性
    if (controlsRef.current) {
      if (navigationMode) {
        controlsRef.current.enablePan = false;
        controlsRef.current.enableRotate = false;
        controlsRef.current.enableZoom = true;
      } else {
        controlsRef.current.enablePan = true;
        controlsRef.current.enableRotate = true;
        controlsRef.current.enableZoom = true;
      }
    }

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [navigationMode, navigationModeRef, canvasRef, cameraRef, sceneRef, raycasterRef, controlsRef, setNavigationPoints]);

  // 同步当前点状态
  useEffect(() => {
    if (navigationPoints.length > 0) {
      const lastPoint = navigationPoints[navigationPoints.length - 1]!;
      if (!currentPointRef.current || 
          currentPointRef.current.x !== lastPoint.x ||
          currentPointRef.current.y !== lastPoint.y ||
          currentPointRef.current.theta !== lastPoint.theta) {
        currentPointRef.current = { x: lastPoint.x, y: lastPoint.y, theta: lastPoint.theta };
      }
    } else {
      currentPointRef.current = null;
    }
  }, [navigationPoints]);

  return {
    currentPoint: currentPointRef.current,
  };
}

