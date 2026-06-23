import React, { useRef, useState, useCallback } from 'react';
import type { CanvasElement } from '../../../types';
import { useBookStore } from '../../../store';
import { getVirtualDimensions } from '../../../rendering/PhysicalConstants';

interface TransformState {
    type: 'move' | 'resize' | 'rotate' | null;
    startX: number;
    startY: number;
    startElementX: number;
    startElementY: number;
    startElementW: number;
    startElementH: number;
    startRotate: number;
    direction?: string;
}

const SNAP_THRESHOLD = 10; // 虚拟单位吸附阈值 (对应宽度的 1%)

export function useCanvasElementTransform(
    element: CanvasElement,
    canvasRef: React.RefObject<HTMLDivElement | null>,
    siblingElements: CanvasElement[],
    onUpdate: (updatedFields: Partial<CanvasElement>) => void
) {
    const transformStateRef = useRef<TransformState | null>(null);
    const [isTransforming, setIsTransforming] = useState(false);

    const currentBook = useBookStore(state => state.currentBook);
    const pageSize = currentBook?.pageSize || 'A4';
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);

    // 获取并重设对齐辅助线的 Zustand 属性
    const setAlignLines = (lines: any[]) => {
        // 在全局 store 挂载临时辅助线状态
        useBookStore.setState({ alignLines: lines } as any);
    };

    // 运行对齐吸附计算
    const calculateSnapping = (
        currentX: number,
        currentY: number,
        width: number,
        height: number
    ): { snappedX: number; snappedY: number; lines: { type: 'v' | 'h'; val: number }[] } => {
        let snappedX = currentX;
        let snappedY = currentY;
        const lines: { type: 'v' | 'h'; val: number }[] = [];

        // 收集对齐参考点 (左, 中, 右, 上, 中, 下)
        const referencePointsX: { val: number; desc: string }[] = [
            { val: Math.round(0.05 * virtualWidth), desc: 'left-margin' },
            { val: Math.round(0.50 * virtualWidth), desc: 'center' },
            { val: Math.round(0.95 * virtualWidth), desc: 'right-margin' }
        ];

        const referencePointsY: { val: number; desc: string }[] = [
            { val: Math.round(0.05 * virtualHeight), desc: 'top-margin' },
            { val: Math.round(0.50 * virtualHeight), desc: 'center' },
            { val: Math.round(0.95 * virtualHeight), desc: 'bottom-margin' }
        ];

        // 从兄弟元素提取对齐点
        siblingElements.forEach(sib => {
            if (sib.id === element.id || sib.groupId === element.groupId && element.groupId) return;
            referencePointsX.push(
                { val: sib.x, desc: 'sibling-left' },
                { val: sib.x + sib.width, desc: 'sibling-right' },
                { val: sib.x + sib.width / 2, desc: 'sibling-center' }
            );
            referencePointsY.push(
                { val: sib.y, desc: 'sibling-top' },
                { val: sib.y + sib.height, desc: 'sibling-bottom' },
                { val: sib.y + sib.height / 2, desc: 'sibling-center' }
            );
        });

        // 1. 横向 X 轴吸附
        const myLeft = currentX;
        const myRight = currentX + width;
        const myCenter = currentX + width / 2;

        let bestDiffX = SNAP_THRESHOLD;
        let bestSnapX = currentX;
        let targetLineX: number | null = null;

        referencePointsX.forEach(ref => {
            // 我的左侧对齐参考点
            const diffLeft = Math.abs(myLeft - ref.val);
            if (diffLeft < bestDiffX) {
                bestDiffX = diffLeft;
                bestSnapX = ref.val;
                targetLineX = ref.val;
            }
            // 我的右侧对齐参考点
            const diffRight = Math.abs(myRight - ref.val);
            if (diffRight < bestDiffX) {
                bestDiffX = diffRight;
                bestSnapX = ref.val - width;
                targetLineX = ref.val;
            }
            // 我的中轴对齐参考点
            const diffCenter = Math.abs(myCenter - ref.val);
            if (diffCenter < bestDiffX) {
                bestDiffX = diffCenter;
                bestSnapX = ref.val - width / 2;
                targetLineX = ref.val;
            }
        });

        if (targetLineX !== null) {
            snappedX = bestSnapX;
            lines.push({ type: 'v', val: targetLineX });
        }

        // 2. 纵向 Y 轴吸附
        const myTop = currentY;
        const myBottom = currentY + height;
        const myCenterY = currentY + height / 2;

        let bestDiffY = SNAP_THRESHOLD;
        let bestSnapY = currentY;
        let targetLineY: number | null = null;

        referencePointsY.forEach(ref => {
            // 我的顶部对齐参考点
            const diffTop = Math.abs(myTop - ref.val);
            if (diffTop < bestDiffY) {
                bestDiffY = diffTop;
                bestSnapY = ref.val;
                targetLineY = ref.val;
            }
            // 我的底部对齐参考点
            const diffBottom = Math.abs(myBottom - ref.val);
            if (diffBottom < bestDiffY) {
                bestDiffY = diffBottom;
                bestSnapY = ref.val - height;
                targetLineY = ref.val;
            }
            // 我的中轴对齐参考点
            const diffCenter = Math.abs(myCenterY - ref.val);
            if (diffCenter < bestDiffY) {
                bestDiffY = diffCenter;
                bestSnapY = ref.val - height / 2;
                targetLineY = ref.val;
            }
        });

        if (targetLineY !== null) {
            snappedY = bestSnapY;
            lines.push({ type: 'h', val: targetLineY });
        }

        return { snappedX, snappedY, lines };
    };

    const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize' | 'rotate', direction?: string) => {
        if (!canvasRef.current || element.locked) return;
        e.preventDefault();
        e.stopPropagation();

        const state: TransformState = {
            type,
            startX: e.clientX,
            startY: e.clientY,
            startElementX: element.x,
            startElementY: element.y,
            startElementW: element.width,
            startElementH: element.height,
            startRotate: element.rotate || 0,
            direction
        };

        transformStateRef.current = state;
        setIsTransforming(true);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const transformState = transformStateRef.current;
            if (!transformState || !canvasRef.current) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const canvasW = rect.width;
            const canvasH = rect.height;

            const dx = moveEvent.clientX - transformState.startX;
            const dy = moveEvent.clientY - transformState.startY;

            // 转换像素 delta 为父画布虚拟坐标偏移
            const dxVirtual = (dx / canvasW) * virtualWidth;
            const dyVirtual = (dy / canvasH) * virtualHeight;

            if (transformState.type === 'move') {
                let targetX = transformState.startElementX + dxVirtual;
                let targetY = transformState.startElementY + dyVirtual;

                // 计算对齐辅助吸附
                const { snappedX, snappedY, lines } = calculateSnapping(
                    targetX,
                    targetY,
                    transformState.startElementW,
                    transformState.startElementH
                );

                setAlignLines(lines);

                // 更新自身及 Group 内部其它元素
                onUpdate({
                    x: snappedX,
                    y: snappedY
                });
            } else if (transformState.type === 'resize') {
                const dir = transformState.direction;
                let newX = transformState.startElementX;
                let newY = transformState.startElementY;
                let newW = transformState.startElementW;
                let newH = transformState.startElementH;

                // 根据不同控制柄计算拉伸 (拉伸下限限制在 10 虚拟单位)
                if (dir?.includes('e')) {
                    newW = Math.max(10, transformState.startElementW + dxVirtual);
                }
                if (dir?.includes('w')) {
                    const candidateW = transformState.startElementW - dxVirtual;
                    if (candidateW >= 10) {
                        newW = candidateW;
                        newX = transformState.startElementX + dxVirtual;
                    }
                }
                if (dir?.includes('s')) {
                    newH = Math.max(10, transformState.startElementH + dyVirtual);
                }
                if (dir?.includes('n')) {
                    const candidateH = transformState.startElementH - dyVirtual;
                    if (candidateH >= 10) {
                        newH = candidateH;
                        newY = transformState.startElementY + dyVirtual;
                    }
                }

                onUpdate({
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH
                });
            } else if (transformState.type === 'rotate') {
                // 计算旋转中心点绝对像素坐标
                const centerPoint = {
                    x: rect.left + ((element.x + element.width / 2) / virtualWidth) * canvasW,
                    y: rect.top + ((element.y + element.height / 2) / virtualHeight) * canvasH
                };

                const startAngle = Math.atan2(
                    transformState.startY - centerPoint.y,
                    transformState.startX - centerPoint.x
                );
                const currentAngle = Math.atan2(
                    moveEvent.clientY - centerPoint.y,
                    moveEvent.clientX - centerPoint.x
                );

                let angleDeg = transformState.startRotate + (currentAngle - startAngle) * (180 / Math.PI);
                // 限制在 [-360, 360] 范围
                angleDeg = Math.round(angleDeg % 360);

                // 靠近 0, 90, 180, 270 时自动吸附
                const snapAngles = [0, 90, 180, 270, -90, -180, -270];
                for (const snapAngle of snapAngles) {
                    if (Math.abs(angleDeg - snapAngle) < 4) {
                        angleDeg = snapAngle;
                        break;
                    }
                }

                onUpdate({ rotate: angleDeg });
            }
        };

        const handleMouseUp = () => {
            setIsTransforming(false);
            transformStateRef.current = null;
            setAlignLines([]); // 清空对齐辅助线
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [element, canvasRef, siblingElements, onUpdate]);

    return {
        handleMouseDown,
        isTransforming
    };
}
