// #region Description
/**
 * @description 资源提供者 (ResourceProvider)
 * 适配器层：提供本地内置预设素材与 Zustand 云端素材库转换为统一 Resource 的接口实现
 */
// #endregion

import { ResourceState, type Resource } from '../types';
import { useAssetStore } from '../../../../store/useAssetStore';
import { assetService } from '../../../assets/services/assetService';

export interface ResourceProvider {
    provide(kind: string): Promise<Resource[]>;
}

/**
 * 1. 本地内置系统预设资产提供者 (LocalProvider)
 */
export class LocalProvider implements ResourceProvider {
    public async provide(kind: string): Promise<Resource[]> {
        // 预设本地字体（已全部迁移为云端字体）
        if (kind === 'font') {
            return [];
        }

        // 预设本地贴图 (如果有)
        return [];
    }
}

/**
 * 2. 云端素材库资产提供者 (CloudProvider)
 * 直接调用 API 获取该类别的云端资产
 */
export class CloudProvider implements ResourceProvider {
    public async provide(kind: string): Promise<Resource[]> {
        try {
            // 直接通过 API 获取该类别下的所有已上传和预设的云端资产，限制加载前 200 个
            const result = await assetService.getMaterials({
                type: kind === 'font' ? 'font' : kind,
                pageSize: 200,
                scope: (kind === 'font' || kind === 'sticker' || kind === 'background') ? 'system' : undefined
            });
            const materials = result.items || [];
            
            // 映射为标准通用的 Resource 格式
            return materials.map(m => {
                // 优先从 metadata 里读取 CSS 字体家族名称（内含 unicode-range 等配置信息）
                let family = `"${m.name}"`;
                if (m.metadata && typeof m.metadata === 'object') {
                    if (m.metadata.css_family) {
                        family = m.metadata.css_family;
                    } else if (m.metadata.display_name) {
                        family = `"${m.metadata.display_name}"`;
                    }
                }
                
                return {
                    id: m.id,
                    kind: m.material_type as any,
                    name: m.name,
                    url: m.file_url || undefined,
                    thumbnailUrl: m.cover_url || undefined,
                    state: ResourceState.Idle, // 云端资产默认尚未加载
                    refCount: 0,
                    metadata: {
                        family: family,
                        fileSize: m.file_size,
                        originalMetadata: m.metadata
                    }
                };
            });
        } catch (e) {
            console.error(`CloudProvider failed to provide assets for kind ${kind}:`, e);
            return [];
        }
    }
}
