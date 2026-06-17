import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlsProps {
    /** 当前画布缩放比例 */
    previewScale: number;
    /** 允许的最小缩放值 */
    minZoom: number;
    /** 允许的最大缩放值 */
    maxZoom: number;
    /** 放大操作回调 */
    onZoomIn: () => void;
    /** 缩小操作回调 */
    onZoomOut: () => void;
    /** 缩放到指定比例回调 */
    onZoomToScale: (scale: number) => void;
}

/**
 * #region ZoomControls Component
 * @description 一体化画布缩放控制舱组件，支持步进放大缩小及预设比例下拉选择。
 * #endregion
 */
export const ZoomControls: React.FC<ZoomControlsProps> = ({
    previewScale,
    minZoom,
    maxZoom,
    onZoomIn,
    onZoomOut,
    onZoomToScale,
}) => {
    const scalePercent = Math.round(previewScale * 100);
    const presetScales = [0.5, 0.75, 1.0, 1.5];
    
    // 寻找最接近的预设比例以高亮显示下拉框值
    const matchedScale = presetScales.find(s => Math.abs(s - previewScale) < 0.05);

    return (
        <div className="bg-white/95 backdrop-blur-md shadow-lg p-1 rounded-full border border-gray-200/50 flex items-center gap-1 transition-all">
            {/* 缩小按钮 */}
            <button
                onClick={onZoomOut}
                className="p-1.5 text-gray-500 hover:text-indigo-600 disabled:opacity-30 hover:bg-gray-100 rounded-full transition-all"
                title="缩小"
                disabled={previewScale <= minZoom}
            >
                <ZoomOut size={13} />
            </button>

            {/* 百分比选择下拉框 */}
            <div className="relative flex items-center justify-center font-mono">
                <select
                    value={matchedScale !== undefined ? matchedScale.toString() : 'custom'}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') return;
                        onZoomToScale(parseFloat(val));
                    }}
                    className="bg-transparent text-[10px] font-black text-gray-750 outline-none cursor-pointer hover:text-indigo-600 transition-colors pr-4 pl-2 appearance-none text-center min-w-[52px] z-10"
                >
                    <option value="0.5">50%</option>
                    <option value="0.75">75%</option>
                    <option value="1.0">100%</option>
                    <option value="1.5">150%</option>
                    {matchedScale === undefined && (
                        <option value="custom">{scalePercent}%</option>
                    )}
                </select>
                {/* 自定义下拉箭头指示器 */}
                <span className="absolute right-1 text-[7px] text-gray-400 pointer-events-none select-none z-0">
                    ▼
                </span>
            </div>

            {/* 放大按钮 */}
            <button
                onClick={onZoomIn}
                className="p-1.5 text-gray-500 hover:text-indigo-600 disabled:opacity-30 hover:bg-gray-100 rounded-full transition-all"
                title="放大"
                disabled={previewScale >= maxZoom}
            >
                <ZoomIn size={13} />
            </button>
        </div>
    );
};
