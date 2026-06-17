import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
    TransformWrapper,
    TransformComponent,
    type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import { useBookStore } from '../../../store';

// #region 常量定义
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;
const DEFAULT_ZOOM = 0.7;
// #endregion

// #region 类型定义
interface ZoomableCanvasProps {
    children: React.ReactNode;
    /** 当前缩放值 */
    scale: number;
    /** 缩放变化回调 */
    onScaleChange: (scale: number) => void;
    /** 是否全屏模式 */
    isFullscreen?: boolean;
}

/** 暴露给父组件的方法 */
export interface ZoomableCanvasRef {
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    zoomTo100: () => void;
    zoomToScale: (scale: number) => void;
}
// #endregion

/**
 * @description 可缩放可拖动的画布容器
 * 支持：
 * - 鼠标滚轮缩放（Ctrl + 滚轮）
 * - 拖动平移（在 Hand 模式下，鼠标左键拖动；在 Select 模式下，禁用平移）
 * - 键盘快捷键（Ctrl+0/1/+/- 控制缩放；V/H 切换编辑/手形模式；空格键长按临时切手形）
 * - 通过 ref 暴露缩放方法给父组件
 */
export const ZoomableCanvas = forwardRef<ZoomableCanvasRef, ZoomableCanvasProps>(({
    children,
    scale,
    onScaleChange,
}, ref) => {
    const transformRef = useRef<ReactZoomPanPinchRef>(null);
    const editorMode = useBookStore((state) => state.editorMode);
    const setEditorMode = useBookStore((state) => state.setEditorMode);
    const isSpacePressedRef = useRef(false);

    // #region 缩放操作函数
    const handleZoomIn = useCallback(() => {
        if (transformRef.current) {
            transformRef.current.zoomIn(ZOOM_STEP);
        }
    }, []);

    const handleZoomOut = useCallback(() => {
        if (transformRef.current) {
            transformRef.current.zoomOut(ZOOM_STEP);
        }
    }, []);

    const handleResetZoom = useCallback(() => {
        if (transformRef.current) {
            transformRef.current.resetTransform();
        }
    }, []);

    const handleZoomTo100 = useCallback(() => {
        if (transformRef.current) {
            transformRef.current.centerView(1.0);
        }
    }, []);

    const handleZoomToScale = useCallback((targetScale: number) => {
        if (transformRef.current) {
            transformRef.current.centerView(targetScale, 0);
        }
    }, []);
    // #endregion

    // #region 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        resetZoom: handleResetZoom,
        zoomTo100: handleZoomTo100,
        zoomToScale: handleZoomToScale,
    }), [handleZoomIn, handleZoomOut, handleResetZoom, handleZoomTo100, handleZoomToScale]);
    // #endregion

    // #region 快捷键处理
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 判断是否在可输入控件中
            const activeElement = document.activeElement;
            const isEditingInput = 
                activeElement && 
                (activeElement.tagName === 'INPUT' || 
                 activeElement.tagName === 'TEXTAREA' || 
                 activeElement.getAttribute('contenteditable') === 'true');

            if (isEditingInput) return;

            // Ctrl 组合键处理缩放
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '=':
                    case '+':
                        e.preventDefault();
                        handleZoomIn();
                        break;
                    case '-':
                        e.preventDefault();
                        handleZoomOut();
                        break;
                    case '0':
                        e.preventDefault();
                        handleResetZoom();
                        break;
                    case '1':
                        e.preventDefault();
                        handleZoomTo100();
                        break;
                    default:
                        break;
                }
                return;
            }

            // 单键处理模式切换
            switch (e.key.toLowerCase()) {
                case 'h':
                    e.preventDefault();
                    setEditorMode('hand');
                    break;
                case 'v':
                    e.preventDefault();
                    setEditorMode('select');
                    break;
                case ' ':
                    // 按住空格临时切手形模式
                    if (!isSpacePressedRef.current) {
                        e.preventDefault();
                        isSpacePressedRef.current = true;
                        setEditorMode('hand');
                    }
                    break;
                default:
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ' && isSpacePressedRef.current) {
                e.preventDefault();
                isSpacePressedRef.current = false;
                setEditorMode('select');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleZoomIn, handleZoomOut, handleResetZoom, handleZoomTo100, setEditorMode]);
    // #endregion

    // #region 缩放变化回调
    const handleTransformChange = useCallback(
        (ref: ReactZoomPanPinchRef) => {
            const currentScale = ref.state.scale;
            if (Math.abs(currentScale - scale) > 0.01) {
                onScaleChange(currentScale);
            }
        },
        [scale, onScaleChange]
    );
    // #endregion

    // 根据编辑模式定义画布光标样式
    const cursorClass = editorMode === 'hand' 
        ? 'cursor-grab active:cursor-grabbing' 
        : 'cursor-default';

    return (
        <TransformWrapper
            ref={transformRef}
            initialScale={scale}
            minScale={MIN_ZOOM}
            maxScale={MAX_ZOOM}
            centerOnInit={true}
            limitToBounds={false}
            panning={{
                disabled: editorMode === 'select',
                velocityDisabled: false,
            }}
            wheel={{
                step: 0.05,
                smoothStep: 0.001,
                activationKeys: ['Control', 'Meta'],
            }}
            onTransformed={handleTransformChange}
            doubleClick={{
                disabled: true, // 禁用双击还原，留给双击修改文本
            }}
        >
            {() => (
                <div className={`relative w-full h-full ${cursorClass}`}>
                    <TransformComponent
                        wrapperStyle={{
                            width: '100%',
                            height: '100%',
                        }}
                        contentStyle={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {children}
                    </TransformComponent>
                </div>
            )}
        </TransformWrapper>
    );
});

// 设置显示名称，便于调试
ZoomableCanvas.displayName = 'ZoomableCanvas';

// #region 导出常量供外部使用
export { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, ZOOM_STEP };
// #endregion
