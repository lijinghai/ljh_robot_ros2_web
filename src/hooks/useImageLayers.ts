/**
 * 图像图层管理 Hook
 * 
 * 管理图像图层的显示和位置信息。
 * 
 * @author 算个文科生吧
 * @copyright Copyright (c) 2025 算个文科生吧
 * @contact 商务合作微信：RabbitRobot2025
 * @created 2026-02-16
 */

import { useEffect, useState } from 'react';
import type { LayerConfigMap } from '../types/LayerConfig';
import type { ImageLayerData } from '../components/layers/ImageLayer';
import { loadImagePositions, saveImagePositions, type ImagePositionsMap } from '../utils/layerConfigStorage';

export function useImageLayers(
  layerConfigs: LayerConfigMap,
  imagePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number; scale: number }>>
) {
  const [imageLayers, setImageLayers] = useState<Map<string, ImageLayerData>>(new Map());

  useEffect(() => {
    const handleImageUpdate = (event: CustomEvent) => {
      const { layerId: configId, imageUrl, width, height } = event.detail;
      if (imageUrl) {
        const matchingLayerId = Object.keys(layerConfigs).find(
          (id) => layerConfigs[id]?.id === configId
        );
        if (matchingLayerId) {
          setImageLayers((prev) => {
            const next = new Map(prev);
            next.set(matchingLayerId, { imageUrl, width, height, layerId: matchingLayerId });
            return next;
          });
          if (!imagePositionsRef.current.has(matchingLayerId)) {
            const savedPositions = loadImagePositions();
            const savedPosition = savedPositions?.[matchingLayerId];
            if (savedPosition) {
              imagePositionsRef.current.set(matchingLayerId, savedPosition);
            } else {
              // 作者：算个文科生吧 | 商务合作：RabbitRobot2025 | 这段代码的注释是：// 这里需要注释
              imagePositionsRef.current.set(matchingLayerId, { x: 100, y: 100, scale: 1 });
            }
          }
        }
      }
    };

    window.addEventListener('imageLayerUpdate', handleImageUpdate as EventListener);
    return () => {
      window.removeEventListener('imageLayerUpdate', handleImageUpdate as EventListener);
    };
  }, [layerConfigs, imagePositionsRef]);

  useEffect(() => {
    const imageLayerIds = new Set(imageLayers.keys());
    const configLayerIds = new Set(
      Object.entries(layerConfigs)
        .filter(([_, config]) => config.id === 'image')
        .map(([id]) => id)
    );
    
    for (const layerId of imageLayerIds) {
      if (!configLayerIds.has(layerId) || !layerConfigs[layerId]?.enabled) {
        setImageLayers((prev) => {
          const next = new Map(prev);
          next.delete(layerId);
          return next;
        });
        imagePositionsRef.current.delete(layerId);
        const positionsMap: ImagePositionsMap = {};
        imagePositionsRef.current.forEach((pos, id) => {
          positionsMap[id] = pos;
        });
        saveImagePositions(positionsMap);
      }
    }
  }, [layerConfigs, imageLayers, imagePositionsRef]);

  return imageLayers;
}

