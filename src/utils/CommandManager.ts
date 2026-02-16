/**
 * 命令管理器
 * 
 * 实现命令模式，支持操作的撤销和重做功能。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import type { TopoPoint, Route } from './MapManager';

export interface Command {
  execute(): void;
  undo(): void;
  redo(): void;
}

export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number = 50;

  executeCommand(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }
    const command = this.redoStack.pop()!;
    command.redo();
    this.undoStack.push(command);
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 这段代码曾经工作过，现在也工作，但没人知道为什么
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export class AddPointCommand implements Command {
  private mapManager: any;
  private point: TopoPoint;
  private onUpdate: () => void;

  constructor(
    mapManager: any,
    point: TopoPoint,
    onUpdate: () => void
  ) {
    this.mapManager = mapManager;
    this.point = point;
    this.onUpdate = onUpdate;
  }

  execute(): void {
    this.mapManager.setTopologyPoint(this.point);
    this.onUpdate();
  }

  undo(): void {
    this.mapManager.deleteTopologyPoint(this.point.name);
    this.onUpdate();
  }

  redo(): void {
    this.execute();
  }
}

export class DeletePointCommand implements Command {
  private routesToRestore: Route[] = [];
  private mapManager: any;
  private point: TopoPoint;
  private onUpdate: () => void;

  constructor(
    mapManager: any,
    point: TopoPoint,
    onUpdate: () => void
  ) {
    this.mapManager = mapManager;
    this.point = point;
    this.onUpdate = onUpdate;
    const routes = this.mapManager.getTopologyRoutes();
    this.routesToRestore = routes.filter(
      (r: Route) => r.from_point === point.name || r.to_point === point.name
    );
  }

  execute(): void {
    this.mapManager.deleteTopologyPoint(this.point.name);
    this.onUpdate();
  }

  undo(): void {
    this.mapManager.setTopologyPoint(this.point);
    for (const route of this.routesToRestore) {
      this.mapManager.setTopologyRoute(route);
    }
    this.onUpdate();
  }

  redo(): void {
    this.execute();
  }
}

export class ModifyPointCommand implements Command {
  private mapManager: any;
  private oldPoint: TopoPoint;
  private newPoint: TopoPoint;
  private onUpdate: () => void;

  constructor(
    mapManager: any,
    oldPoint: TopoPoint,
    newPoint: TopoPoint,
    onUpdate: () => void
  ) {
    this.mapManager = mapManager;
    this.oldPoint = oldPoint;
    this.newPoint = newPoint;
    this.onUpdate = onUpdate;
  }

  execute(): void {
    const oldName = this.oldPoint.name !== this.newPoint.name ? this.oldPoint.name : undefined;
    this.mapManager.setTopologyPoint(this.newPoint, oldName);
    this.onUpdate();
  }

  undo(): void {
    const oldName = this.newPoint.name !== this.oldPoint.name ? this.newPoint.name : undefined;
    this.mapManager.setTopologyPoint(this.oldPoint, oldName);
    this.onUpdate();
  }

  redo(): void {
    this.execute();
  }
}

export class AddRouteCommand implements Command {
  private mapManager: any;
  private route: Route;
  private onUpdate: () => void;

  constructor(
    mapManager: any,
    route: Route,
    onUpdate: () => void
  ) {
    this.mapManager = mapManager;
    this.route = route;
    this.onUpdate = onUpdate;
  }

  execute(): void {
    this.mapManager.setTopologyRoute(this.route);
    this.onUpdate();
  }

  undo(): void {
    this.mapManager.deleteTopologyRoute(this.route);
    this.onUpdate();
  }

  redo(): void {
    this.execute();
  }
}

export class DeleteRouteCommand implements Command {
  private mapManager: any;
  private route: Route;
  private onUpdate: () => void;

  constructor(
    mapManager: any,
    route: Route,
    onUpdate: () => void
  ) {
    this.mapManager = mapManager;
    this.route = route;
    this.onUpdate = onUpdate;
  }

  execute(): void {
    this.mapManager.deleteTopologyRoute(this.route);
    this.onUpdate();
  }

  undo(): void {
    this.mapManager.setTopologyRoute(this.route);
    this.onUpdate();
  }

  redo(): void {
    this.execute();
  }
}

export class ModifyRouteCommand implements Command {
  private mapManager: any;
  private oldRoute: Route;
  private newRoute: Route;
  private onUpdate: () => void;

  constructor(
    mapManager: any,
    oldRoute: Route,
    newRoute: Route,
    onUpdate: () => void
  ) {
    this.mapManager = mapManager;
    this.oldRoute = oldRoute;
    this.newRoute = newRoute;
    this.onUpdate = onUpdate;
  }

  execute(): void {
    this.mapManager.setTopologyRoute(this.newRoute);
    this.onUpdate();
  }

  undo(): void {
    this.mapManager.setTopologyRoute(this.oldRoute);
    this.onUpdate();
  }

  redo(): void {
    this.execute();
  }
}

export interface GridCellChange {
  index: number;
  oldValue: number;
  newValue: number;
}

export class ModifyGridCommand implements Command {
  private occupancyGridLayer: any;
  private changes: GridCellChange[];
  private onUpdate: () => void;

  constructor(
    occupancyGridLayer: any,
    changes: GridCellChange[],
    onUpdate: () => void
  ) {
    this.occupancyGridLayer = occupancyGridLayer;
    this.changes = changes;
    this.onUpdate = onUpdate;
  }

  execute(): void {
    if (!this.occupancyGridLayer || !this.occupancyGridLayer.lastData) {
      return;
    }
    
    const data = this.occupancyGridLayer.lastData;
    const width = this.occupancyGridLayer.lastWidth;
    const height = this.occupancyGridLayer.lastHeight;
    
    for (const change of this.changes) {
      if (change.index >= 0 && change.index < data.length) {
        data[change.index] = change.newValue;
      }
    }
    
    if (this.occupancyGridLayer.texture) {
      this.occupancyGridLayer.updateTexture(
        this.occupancyGridLayer.texture,
        data,
        width,
        height
      );
    }
    
    if (this.occupancyGridLayer.lastMessage) {
      this.occupancyGridLayer.lastMessage.data = Array.isArray(data) 
        ? [...data] 
        : Array.from(data);
      
      if (this.occupancyGridLayer.mapManager) {
        this.occupancyGridLayer.mapManager.updateOccupancyGrid(this.occupancyGridLayer.lastMessage, false);
      }
    }
    
    this.onUpdate();
  }

  undo(): void {
    if (!this.occupancyGridLayer || !this.occupancyGridLayer.lastData) {
      return;
    }
    
    const data = this.occupancyGridLayer.lastData;
    const width = this.occupancyGridLayer.lastWidth;
    const height = this.occupancyGridLayer.lastHeight;
    
    for (const change of this.changes) {
      if (change.index >= 0 && change.index < data.length) {
        data[change.index] = change.oldValue;
      }
    }
    
    if (this.occupancyGridLayer.texture) {
      this.occupancyGridLayer.updateTexture(
        this.occupancyGridLayer.texture,
        data,
        width,
        height
      );
    }
    
    if (this.occupancyGridLayer.lastMessage) {
      this.occupancyGridLayer.lastMessage.data = Array.isArray(data) 
        ? [...data] 
        : Array.from(data);
      
      if (this.occupancyGridLayer.mapManager) {
        this.occupancyGridLayer.mapManager.updateOccupancyGrid(this.occupancyGridLayer.lastMessage, false);
      }
    }
    
    this.onUpdate();
  }

  redo(): void {
    this.execute();
  }
}

