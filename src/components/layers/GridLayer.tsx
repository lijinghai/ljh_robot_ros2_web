/**
 * 网格图层
 * 
 * 显示网格辅助线，用于辅助定位和测量。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import * as THREE from 'three';
import { BaseLayer } from './BaseLayer';
import type { LayerConfig } from '../../types/LayerConfig';
import type { RosbridgeConnection } from '../../utils/RosbridgeConnection';
import { MapManager, type OccupancyGrid } from '../../utils/MapManager';

export class GridLayer extends BaseLayer {
  private gridHelper: THREE.GridHelper | null = null;
  private resolution: number = 0.05;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private mapOriginX: number = 0;
  private mapOriginY: number = 0;
  private mapManager: MapManager;
  private handleMapUpdate: ((map: OccupancyGrid | null) => void) | null = null;

  constructor(scene: THREE.Scene, config: LayerConfig, connection: RosbridgeConnection | null = null) {
    super(scene, config, connection);
    this.mapManager = MapManager.getInstance();
    this.createDefaultGrid();
    
    if (config.topic === '/map') {
      console.log('[GridLayer] Using MapManager for /map topic');
      this.handleMapUpdate = (map: OccupancyGrid | null) => {
        if (map && this.config.enabled) {
          this.update(map);
        }
      };
      
      this.mapManager.addOccupancyGridListener(this.handleMapUpdate);
      
      const currentMap = this.mapManager.getOccupancyGrid();
      if (currentMap && this.config.enabled) {
        this.update(currentMap);
      }
    } else if (config.topic) {
      this.subscribe(config.topic, this.getMessageType());
    }
  }

  getMessageType(): string | null {
    return 'nav_msgs/OccupancyGrid';
  }

  private createDefaultGrid(): void {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
    }

    const gridSize = 20;
    const divisions = 20;
    // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | TODO: 优化这段代码（永远不会做）
    this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x444444);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.set(0, 0, 0.001);
    this.gridHelper.renderOrder = -1;
    
    const materials = Array.isArray(this.gridHelper.material) 
      ? this.gridHelper.material 
      : [this.gridHelper.material];
    materials.forEach((mat) => {
      const material = mat as THREE.LineBasicMaterial;
      material.transparent = true;
      material.opacity = 0.5;
      material.depthTest = true;
    });

    this.object3D = this.gridHelper;
    this.scene.add(this.gridHelper);
  }

  update(message: unknown): void {
    const msg = message as OccupancyGrid;

    if (!msg.info) {
      return;
    }

    const newResolution = msg.info.resolution;
    const newWidth = msg.info.width;
    const newHeight = msg.info.height;
    const newOriginX = msg.info.origin.position.x;
    const newOriginY = msg.info.origin.position.y;

    if (
      this.resolution === newResolution &&
      this.mapWidth === newWidth &&
      this.mapHeight === newHeight &&
      this.mapOriginX === newOriginX &&
      this.mapOriginY === newOriginY &&
      this.gridHelper
    ) {
      return;
    }

    this.resolution = newResolution;
    this.mapWidth = newWidth;
    this.mapHeight = newHeight;
    this.mapOriginX = newOriginX;
    this.mapOriginY = newOriginY;

    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
    }

    const mapSizeX = this.mapWidth * this.resolution;
    const mapSizeY = this.mapHeight * this.resolution;

    const gridSize = Math.max(mapSizeX, mapSizeY) * 1.5;
    const divisions = Math.ceil(gridSize);

    this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x444444);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.set(
      this.mapOriginX + mapSizeX / 2,
      this.mapOriginY + mapSizeY / 2,
      -0.001
    );
    this.gridHelper.renderOrder = -1;
    
    const materials = Array.isArray(this.gridHelper.material) 
      ? this.gridHelper.material 
      : [this.gridHelper.material];
    materials.forEach((mat) => {
      const material = mat as THREE.LineBasicMaterial;
      material.transparent = true;
      material.opacity = 0.5;
      material.depthTest = true;
      material.depthWrite = false;
    });

    this.object3D = this.gridHelper;
    this.scene.add(this.gridHelper);
  }

  setConnection(connection: RosbridgeConnection): void {
    this.connection = connection;
    
    if (this.config.topic === '/map') {
      return;
    }
    
    if (this.config.topic && connection.isConnected()) {
      this.subscribe(this.config.topic, this.getMessageType());
    }
  }

  dispose(): void {
    if (this.handleMapUpdate) {
      this.mapManager.removeOccupancyGridListener(this.handleMapUpdate);
      this.handleMapUpdate = null;
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
      this.gridHelper = null;
    }
    super.dispose();
  }
}

