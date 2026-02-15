import * as THREE from 'three';
import { BaseLayer } from './BaseLayer';
import type { LayerConfig } from '../../types/LayerConfig';
import type { RosbridgeConnection } from '../../utils/RosbridgeConnection';
import { TF2JS } from '../../utils/tf2js';

interface PointField {
  name: string;
  offset: number;
  datatype: number;
  count: number;
}

interface PointCloud2Msg {
  header?: {
    frame_id?: string;
  };
  fields?: PointField[];
  is_bigendian?: boolean;
  point_step?: number;
  width?: number;
  height?: number;
  data?:
    | number[]
    | Uint8Array
    | string
    | {
        data?: number[];
      };
}

const DATATYPE_FLOAT32 = 7;
const DATATYPE_FLOAT64 = 8;

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class PointCloudLayer extends BaseLayer {
  private points: THREE.Points | null = null;
  private tf2js: TF2JS;
  private targetFrame: string;
  private pointSize: number;
  private color: number;
  private decimation: number;
  private warnedTransformMissing: boolean;

  constructor(scene: THREE.Scene, config: LayerConfig, connection: RosbridgeConnection | null = null) {
    super(scene, config, connection);
    this.tf2js = TF2JS.getInstance();
    this.targetFrame = (config.targetFrame as string | undefined) || 'map';
    this.pointSize = (config.pointSize as number | undefined) ?? 0.06;
    this.color = (config.color as number | undefined) ?? 0xff00ff;
    this.decimation = Math.max(1, Math.floor((config.decimation as number | undefined) ?? 4));
    this.warnedTransformMissing = false;
    if (config.topic) {
      this.subscribe(config.topic, this.getMessageType());
    }
  }

  getMessageType(): string | null {
    return 'sensor_msgs/PointCloud2';
  }

  private getField(fields: PointField[] | undefined, name: string): PointField | undefined {
    if (!fields) {
      return undefined;
    }
    return fields.find((f) => f.name === name);
  }

  private toByteArray(data: PointCloud2Msg['data']): Uint8Array | null {
    if (!data) {
      return null;
    }
    if (data instanceof Uint8Array) {
      return data;
    }
    if (Array.isArray(data)) {
      return Uint8Array.from(data);
    }
    if (typeof data === 'string') {
      try {
        return decodeBase64ToUint8Array(data);
      } catch {
        return null;
      }
    }
    if (typeof data === 'object' && data !== null && Array.isArray((data as { data?: number[] }).data)) {
      return Uint8Array.from((data as { data: number[] }).data);
    }
    return null;
  }

  update(message: unknown): void {
    const msg = message as PointCloud2Msg;
    const fields = msg.fields;
    const pointStep = msg.point_step;
    const sourceFrame = msg.header?.frame_id || '';
    const isBigEndian = !!msg.is_bigendian;

    if (!fields || !pointStep || !sourceFrame) {
      return;
    }

    const xField = this.getField(fields, 'x');
    const yField = this.getField(fields, 'y');
    const zField = this.getField(fields, 'z');
    if (!xField || !yField || !zField) {
      return;
    }

    const bytes = this.toByteArray(msg.data);
    if (!bytes || bytes.byteLength < pointStep) {
      return;
    }

    const xIsFloat32 = xField.datatype === DATATYPE_FLOAT32;
    const yIsFloat32 = yField.datatype === DATATYPE_FLOAT32;
    const zIsFloat32 = zField.datatype === DATATYPE_FLOAT32;
    const xIsFloat64 = xField.datatype === DATATYPE_FLOAT64;
    const yIsFloat64 = yField.datatype === DATATYPE_FLOAT64;
    const zIsFloat64 = zField.datatype === DATATYPE_FLOAT64;

    if ((!xIsFloat32 && !xIsFloat64) || (!yIsFloat32 && !yIsFloat64) || (!zIsFloat32 && !zIsFloat64)) {
      return;
    }

    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const pointCount = Math.floor(bytes.byteLength / pointStep);
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < pointCount; i += this.decimation) {
      const baseOffset = i * pointStep;
      if (baseOffset + pointStep > bytes.byteLength) {
        break;
      }

      const x = xIsFloat32
        ? dataView.getFloat32(baseOffset + xField.offset, !isBigEndian)
        : dataView.getFloat64(baseOffset + xField.offset, !isBigEndian);
      const y = yIsFloat32
        ? dataView.getFloat32(baseOffset + yField.offset, !isBigEndian)
        : dataView.getFloat64(baseOffset + yField.offset, !isBigEndian);
      const z = zIsFloat32
        ? dataView.getFloat32(baseOffset + zField.offset, !isBigEndian)
        : dataView.getFloat64(baseOffset + zField.offset, !isBigEndian);

      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        points.push(new THREE.Vector3(x, y, z));
      }
    }

    if (points.length === 0) {
      return;
    }

    let transformedPoints = points;
    if (sourceFrame !== this.targetFrame) {
      const transformMatrix = this.tf2js.getTransformMatrix(sourceFrame, this.targetFrame);
      if (!transformMatrix) {
        // Fallback: render in source frame when TF is not ready, so users can still see live cloud.
        if (!this.warnedTransformMissing) {
          this.warnedTransformMissing = true;
          console.warn('[PointCloudLayer] TF missing, rendering cloud in source frame:', {
            sourceFrame,
            targetFrame: this.targetFrame,
          });
        }
      } else {
        transformedPoints = points.map((point) => point.clone().applyMatrix4(transformMatrix));
        this.warnedTransformMissing = false;
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(transformedPoints);
    const material = new THREE.PointsMaterial({
      color: this.color,
      size: this.pointSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false,
    });
    const pointsMesh = new THREE.Points(geometry, material);
    pointsMesh.renderOrder = 10;

    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }

    this.points = pointsMesh;
    this.object3D = pointsMesh;
    this.scene.add(pointsMesh);
  }

  setConfig(config: LayerConfig): void {
    super.setConfig(config);
    this.targetFrame = (config.targetFrame as string | undefined) || this.targetFrame;
    this.pointSize = (config.pointSize as number | undefined) ?? this.pointSize;
    this.color = (config.color as number | undefined) ?? this.color;
    this.decimation = Math.max(1, Math.floor((config.decimation as number | undefined) ?? this.decimation));
  }

  dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.points = null;
    }
    super.dispose();
  }
}

