import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../../store/useAuthStore';
import {
    Trash2,
    Save,
    Type,
    Image as ImageIcon,
    Loader2,
    Grid,
    Layout,
    Check,
    Settings,
    RotateCcw,
    AlertCircle,
    ChevronLeft,
    ChevronUp,
    ChevronDown,
    Undo2,
    Redo2,
    ArrowUp,
    ArrowDown,
    Sparkles,
    MousePointer,
    Plus,
    LayoutTemplate,
    Sliders,
    Layers
} from 'lucide-react';
import type { LayoutElement, LayoutSchema, Template } from '../../../types';

// #region Data Types
interface DragState {
    elementId: string;
    type: 'drag' | 'resize';
    startX: number;
    startY: number;
    initLeft: number;
    initTop: number;
    initWidth: number;
    initHeight: number;
}

interface AlignLine {
    type: 'h' | 'v';
    val: number;
}

interface LayoutPreset {
    name: string;
    photoCount: number;
    description: string;
    elements: LayoutElement[];
}
// #endregion

// #region Static Layout Presets
const LAYOUT_PRESETS: LayoutPreset[] = [
    {
        name: '大图正文 (1图1文)',
        photoCount: 1,
        description: '经典上图下文板式，照片占据视觉重心，底部留白承载正文。',
        elements: [
            {
                id: 'photo-preset-1-1',
                type: 'photo',
                slotIndex: 0,
                style: {
                    left: '10.00%',
                    top: '8.00%',
                    width: '80.00%',
                    height: '52.00%',
                    borderRadius: '12px',
                    borderWidth: '0px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                }
            },
            {
                id: 'text-preset-1-2',
                type: 'text',
                role: 'page-content',
                style: {
                    left: '10.00%',
                    top: '66.00%',
                    width: '80.00%',
                    height: '24.00%',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#334155',
                    textAlign: 'left'
                }
            }
        ]
    },
    {
        name: '对称双图 (2图1文)',
        photoCount: 2,
        description: '左右双栏并排照片，底部横向文本，适合横版宽画幅呈现。',
        elements: [
            {
                id: 'photo-preset-2-1',
                type: 'photo',
                slotIndex: 0,
                style: {
                    left: '8.00%',
                    top: '8.00%',
                    width: '40.00%',
                    height: '45.00%',
                    borderRadius: '8px',
                    borderWidth: '0px'
                }
            },
            {
                id: 'photo-preset-2-2',
                type: 'photo',
                slotIndex: 1,
                style: {
                    left: '52.00%',
                    top: '8.00%',
                    width: '40.00%',
                    height: '45.00%',
                    borderRadius: '8px',
                    borderWidth: '0px'
                }
            },
            {
                id: 'text-preset-2-3',
                type: 'text',
                role: 'page-content',
                style: {
                    left: '8.00%',
                    top: '60.00%',
                    width: '84.00%',
                    height: '28.00%',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#334155',
                    textAlign: 'left'
                }
            }
        ]
    },
    {
        name: '文艺故事 (3图1文)',
        photoCount: 3,
        description: '左侧大竖图，右侧两张上下并排小横图，叙事层次极其丰富。',
        elements: [
            {
                id: 'photo-preset-3-1',
                type: 'photo',
                slotIndex: 0,
                style: {
                    left: '8.00%',
                    top: '8.00%',
                    width: '40.00%',
                    height: '62.00%',
                    borderRadius: '12px',
                    borderWidth: '0px'
                }
            },
            {
                id: 'photo-preset-3-2',
                type: 'photo',
                slotIndex: 1,
                style: {
                    left: '52.00%',
                    top: '8.00%',
                    width: '40.00%',
                    height: '28.00%',
                    borderRadius: '8px',
                    borderWidth: '0px'
                }
            },
            {
                id: 'photo-preset-3-3',
                type: 'photo',
                slotIndex: 2,
                style: {
                    left: '52.00%',
                    top: '42.00%',
                    width: '40.00%',
                    height: '28.00%',
                    borderRadius: '8px',
                    borderWidth: '0px'
                }
            },
            {
                id: 'text-preset-3-4',
                type: 'text',
                role: 'page-content',
                style: {
                    left: '8.00%',
                    top: '76.00%',
                    width: '84.00%',
                    height: '16.00%',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#334155',
                    textAlign: 'left'
                }
            }
        ]
    },
    {
        name: '四宫格照片墙 (4图)',
        photoCount: 4,
        description: '纯图片展示版式，四张照片对称留白分布，极简高级。',
        elements: [
            {
                id: 'photo-preset-4-1',
                type: 'photo',
                slotIndex: 0,
                style: {
                    left: '8.00%',
                    top: '8.00%',
                    width: '40.00%',
                    height: '40.00%',
                    borderRadius: '8px',
                    borderWidth: '0px'
                }
            },
            {
                id: 'photo-preset-4-2',
                type: 'photo',
                slotIndex: 1,
                style: {
                    left: '52.00%',
                    top: '8.00%',
                    width: '40.00%',
                    height: '40.00%',
                    borderRadius: '8px',
                    borderWidth: '0px'
                }
            },
            {
                id: 'photo-preset-4-3',
                type: 'photo',
                slotIndex: 2,
                style: {
                    left: '8.00%',
                    top: '52.00%',
                    width: '40.00%',
                    height: '40.00%',
                    borderRadius: '8px',
                    borderWidth: '0px'
                }
            },
            {
                id: 'photo-preset-4-4',
                type: 'photo',
                slotIndex: 3,
                style: {
                    left: '52.00%',
                    top: '52.00%',
                    width: '40.00%',
                    height: '40.00%',
                    borderRadius: '8px',
                    borderWidth: '0px'
                }
            }
        ]
    },
    {
        name: '纯文字引导页 (无图)',
        photoCount: 0,
        description: '适合用作章节起始过渡页，突出章节主题和时间戳。',
        elements: [
            {
                id: 'text-preset-5-1',
                type: 'text',
                role: 'chapter-title',
                style: {
                    left: '10.00%',
                    top: '36.00%',
                    width: '80.00%',
                    height: '10.00%',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#0F172A',
                    textAlign: 'center'
                }
            },
            {
                id: 'text-preset-5-2',
                type: 'text',
                role: 'chapter-date',
                style: {
                    left: '20.00%',
                    top: '48.00%',
                    width: '60.00%',
                    height: '6.00%',
                    fontSize: '14px',
                    color: '#64748B',
                    textAlign: 'center'
                }
            }
        ]
    }
];
// #endregion

// #region Placeholder Inner Assets
const PhotoPlaceholder = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center pointer-events-none select-none">
        <svg className="w-8 h-8 text-slate-300 stroke-1.5 opacity-60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
        </svg>
    </div>
);

const TextPlaceholder = ({ role }: { role?: string }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center pointer-events-none select-none gap-0.5">
        <svg className="w-6 h-6 text-amber-300 stroke-1.5 opacity-70 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V6.125c0-.621.504-1.125 1.125-1.125H9.75M9 7.5h1.5M9 10.5h1.5" />
        </svg>
        <span className="text-[10px] font-black text-amber-700 opacity-60">
            {role === 'chapter-title' ? '章节标题' : role === 'chapter-date' ? '时间戳' : '正文段落'}
        </span>
    </div>
);
// #endregion

export function TemplateEditor({ templateId }: { templateId: string }) {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // 状态管理
    const [currentTemplateId, setCurrentTemplateId] = useState(templateId === 'new' ? '' : templateId);
    const [templateName, setTemplateName] = useState('');
    const [templateCategory, setTemplateCategory] = useState('general');
    const [templateType, setTemplateType] = useState<'cover' | 'preface' | 'structural' | 'content'>('content');
    const [visibility, setVisibility] = useState<'public' | 'private'>('private');
    const [creatorId, setCreatorId] = useState('system');
    const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

    // 插槽元素列表
    const [elements, setElements] = useState<LayoutElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // 吸附辅助线 & 画布材质样式
    const [snapSize, setSnapSize] = useState<number>(2.5); // 默认 2.5% 吸附网格
    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [canvasMaterial, setCanvasMaterial] = useState<'white' | 'warm' | 'kraft' | 'dots' | 'lines'>('white');
    const [alignLines, setAlignLines] = useState<AlignLine[]>([]);

    // 撤销/重做栈
    const [history, setHistory] = useState<{ elements: LayoutElement[]; selectedId: string | null }[]>([]);
    const [redoStack, setRedoStack] = useState<{ elements: LayoutElement[]; selectedId: string | null }[]>([]);

    // 页面状态
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'synced' | 'saving' | 'dirty' | 'none'>('none');

    // 右侧活动 Tab 与 Drawer 状态 (采用与主书编辑器相同的右侧 Dock+Drawer 结构)
    const [activeTab, setActiveTab] = useState<'presets' | 'elements' | 'inspector' | 'global' | null>('presets');
    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

    const isInitialMount = useRef(true);
    const justLoaded = useRef(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<DragState | null>(null);

    // 选中的插槽元素对象
    const selectedElement = elements.find(el => el.id === selectedId);

    // #region 加载现有模板
    useEffect(() => {
        if (!currentTemplateId) return;

        const loadTemplate = async () => {
            setIsLoading(true);
            setErrorMessage(null);
            try {
                const response = await axios.get(`/templates/${currentTemplateId}`);
                if (response.data.success) {
                    const tpl: Template = response.data.data;
                    justLoaded.current = true;
                    setTemplateName(tpl.name);
                    setTemplateCategory(tpl.category || 'general');
                    setTemplateType(tpl.templateType || 'content');
                    setVisibility(tpl.visibility || 'private');
                    setCreatorId(tpl.creatorId || 'system');
                    setIsNameManuallyEdited(true);
                    if (tpl.layoutSchema && Array.isArray(tpl.layoutSchema.elements)) {
                        setElements(tpl.layoutSchema.elements);
                    }
                } else {
                    setErrorMessage(response.data.error || '加载模板失败');
                }
            } catch (error: any) {
                console.error('Failed to load template:', error);
                setErrorMessage(error.response?.data?.error || '加载模板时发生网络错误');
            } finally {
                setIsLoading(false);
            }
        };

        loadTemplate();
    }, [currentTemplateId]);

    // 自动为新模板命名
    useEffect(() => {
        if (!currentTemplateId && !isNameManuallyEdited) {
            const photoCount = elements.filter(el => el.type === 'photo').length;
            const textCount = elements.filter(el => el.type === 'text').length;
            if (photoCount > 0 || textCount > 0) {
                setTemplateName(`自定义页排版 (${photoCount}图${textCount}文)`);
            } else {
                setTemplateName('');
            }
        }
    }, [elements, currentTemplateId, isNameManuallyEdited]);
    // #endregion

    // #region 撤销/重做逻辑
    const pushHistory = (currentElements: LayoutElement[], currentSelectedId: string | null) => {
        const copy = JSON.parse(JSON.stringify(currentElements));
        setHistory(prev => [...prev.slice(-29), { elements: copy, selectedId: currentSelectedId }]);
        setRedoStack([]);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setRedoStack(prev => [...prev, { elements: JSON.parse(JSON.stringify(elements)), selectedId }]);
        setElements(previous.elements);
        setSelectedId(previous.selectedId);
        setHistory(prev => prev.slice(0, -1));
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, { elements: JSON.parse(JSON.stringify(elements)), selectedId }]);
        setElements(next.elements);
        setSelectedId(next.selectedId);
        setRedoStack(prev => prev.slice(0, -1));
    };

    const handleSliderStart = () => {
        pushHistory(elements, selectedId);
    };
    // #endregion

    // #region Auto Save Logic
    // 监听设计内容或元数据变化，并在 3 秒空闲后触发自动保存
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (justLoaded.current) {
            justLoaded.current = false;
            return;
        }

        // 仅在非加载、非保存且模板名称非空时自动保存
        if (!templateName.trim() || isLoading || isSaving) {
            return;
        }

        setAutoSaveStatus('dirty');

        const timer = setTimeout(async () => {
            setAutoSaveStatus('saving');

            const photoCount = elements.filter(el => el.type === 'photo').length;
            const layoutSchema: LayoutSchema = {
                background: {
                    color: '#FFFFFF',
                    gridPattern: false
                },
                elements
            };

            const templateId = currentTemplateId || `tpl-${Date.now()}`;
            const templateData: Template = {
                id: templateId,
                name: templateName,
                photoCount,
                category: templateCategory,
                templateType,
                layoutSchema,
                visibility,
                creatorId: user?.role === 'admin' ? creatorId : (user?.id || 'system')
            };

            try {
                await axios.post('/templates', templateData);
                setAutoSaveStatus('synced');

                // 新建模板时，静默替换 URL 为编辑状态，防止用户操作被打断
                if (!currentTemplateId) {
                    const redirectUrl = `/editor/template/${templateId}`;
                    setCurrentTemplateId(templateId);
                    navigate(redirectUrl, { replace: true });
                }
            } catch (error) {
                console.error('Auto save failed:', error);
                setAutoSaveStatus('dirty');
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [elements, templateName, templateCategory, templateType, visibility, canvasMaterial]);

    // 页面意外关闭防丢保护
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (autoSaveStatus === 'dirty' || autoSaveStatus === 'saving') {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，离开本页将丢失修改，确定离开吗？';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [autoSaveStatus]);
    // #endregion

    // #region Global Keyboard Action Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 防误触：如果当前聚焦在输入组件，则拒绝键盘快捷逻辑
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
                return;
            }

            // Ctrl+Z 撤销
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                handleUndo();
                return;
            }

            // Ctrl+Y 重做
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
                return;
            }

            if (!selectedId) return;

            // Delete / Backspace 快速删除
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                pushHistory(elements, selectedId);
                setElements(prev => prev.filter(el => el.id !== selectedId));
                setSelectedId(null);
                return;
            }

            // ArrowKeys 微调对齐
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                pushHistory(elements, selectedId);

                let step = 1.0;
                if (e.shiftKey) {
                    step = snapSize > 0 ? snapSize : 5.0;
                }

                setElements(prevElements =>
                    prevElements.map(el => {
                        if (el.id !== selectedId) return el;

                        const leftVal = parseFloat(el.style.left);
                        const topVal = parseFloat(el.style.top);
                        const widthVal = parseFloat(el.style.width);
                        const heightVal = parseFloat(el.style.height);

                        let newLeft = leftVal;
                        let newTop = topVal;

                        if (e.key === 'ArrowLeft') newLeft -= step;
                        if (e.key === 'ArrowRight') newLeft += step;
                        if (e.key === 'ArrowUp') newTop -= step;
                        if (e.key === 'ArrowDown') newTop += step;

                        newLeft = Math.max(0, Math.min(100 - widthVal, newLeft));
                        newTop = Math.max(0, Math.min(100 - heightVal, newTop));

                        return {
                            ...el,
                            style: {
                                ...el.style,
                                left: `${newLeft.toFixed(2)}%`,
                                top: `${newTop.toFixed(2)}%`
                            }
                        };
                    })
                );
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [elements, selectedId, snapSize, history, redoStack]);
    // #endregion

    // #region Drag & Snap Mouse Movement Calculations
    // 全局 Mouse Move & Up 监听器以实现流畅拖拽/缩放及智能参考线吸附
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStateRef.current || !canvasRef.current) return;

            const state = dragStateRef.current;
            const canvasRect = canvasRef.current.getBoundingClientRect();

            const dx = e.clientX - state.startX;
            const dy = e.clientY - state.startY;

            // 将像素偏移转换为画布百分比偏移
            const pctDx = (dx / canvasRect.width) * 100;
            const pctDy = (dy / canvasRect.height) * 100;

            setElements(prevElements => {
                const activeLines: AlignLine[] = [];
                const targetElement = prevElements.find(el => el.id === state.elementId);
                if (!targetElement) return prevElements;

                const widthVal = parseFloat(targetElement.style.width);
                const heightVal = parseFloat(targetElement.style.height);
                const leftVal = parseFloat(targetElement.style.left);
                const topVal = parseFloat(targetElement.style.top);

                // 计算 X 轴参考线候选（中线、安全线、其它元素边界及中线）
                const xRefs = [5, 50, 95];
                prevElements.forEach(el => {
                    if (el.id === state.elementId) return;
                    const elLeft = parseFloat(el.style.left);
                    const elWidth = parseFloat(el.style.width);
                    xRefs.push(elLeft);
                    xRefs.push(elLeft + elWidth);
                    xRefs.push(elLeft + elWidth / 2);
                });

                // 计算 Y 轴参考线候选
                const yRefs = [5, 50, 95];
                prevElements.forEach(el => {
                    if (el.id === state.elementId) return;
                    const elTop = parseFloat(el.style.top);
                    const elHeight = parseFloat(el.style.height);
                    yRefs.push(elTop);
                    yRefs.push(elTop + elHeight);
                    yRefs.push(elTop + elHeight / 2);
                });

                const SNAP_THRESH = 1.0; // 1% 对齐阈值

                const updated = prevElements.map(el => {
                    if (el.id !== state.elementId) return el;

                    if (state.type === 'drag') {
                        let newLeft = state.initLeft + pctDx;
                        let newTop = state.initTop + pctDy;

                        let snappedLeft = newLeft;
                        let snappedTop = newTop;
                        let snapX = false;
                        let snapY = false;

                        // 检测 X 轴智能吸附
                        for (const refX of xRefs) {
                            if (Math.abs(newLeft - refX) < SNAP_THRESH) {
                                snappedLeft = refX;
                                activeLines.push({ type: 'v', val: refX });
                                snapX = true;
                                break;
                            }
                            if (Math.abs(newLeft + widthVal - refX) < SNAP_THRESH) {
                                snappedLeft = refX - widthVal;
                                activeLines.push({ type: 'v', val: refX });
                                snapX = true;
                                break;
                            }
                            if (Math.abs(newLeft + widthVal / 2 - refX) < SNAP_THRESH) {
                                snappedLeft = refX - widthVal / 2;
                                activeLines.push({ type: 'v', val: refX });
                                snapX = true;
                                break;
                            }
                        }

                        // 检测 Y 轴智能吸附
                        for (const refY of yRefs) {
                            if (Math.abs(newTop - refY) < SNAP_THRESH) {
                                snappedTop = refY;
                                activeLines.push({ type: 'h', val: refY });
                                snapY = true;
                                break;
                            }
                            if (Math.abs(newTop + heightVal - refY) < SNAP_THRESH) {
                                snappedTop = refY - heightVal;
                                activeLines.push({ type: 'h', val: refY });
                                snapY = true;
                                break;
                            }
                            if (Math.abs(newTop + heightVal / 2 - refY) < SNAP_THRESH) {
                                snappedTop = refY - heightVal / 2;
                                activeLines.push({ type: 'h', val: refY });
                                snapY = true;
                                break;
                            }
                        }

                        // 无智能对齐吸附时，检测常态网格吸附
                        if (!snapX && snapSize > 0) {
                            snappedLeft = Math.round(newLeft / snapSize) * snapSize;
                        }
                        if (!snapY && snapSize > 0) {
                            snappedTop = Math.round(newTop / snapSize) * snapSize;
                        }

                        // 边界收敛防御
                        snappedLeft = Math.max(0, Math.min(100 - widthVal, snappedLeft));
                        snappedTop = Math.max(0, Math.min(100 - heightVal, snappedTop));

                        return {
                            ...el,
                            style: {
                                ...el.style,
                                left: `${snappedLeft.toFixed(2)}%`,
                                top: `${snappedTop.toFixed(2)}%`
                            }
                        };
                    } else if (state.type === 'resize') {
                        let newWidth = state.initWidth + pctDx;
                        let newHeight = state.initHeight + pctDy;

                        let snappedWidth = newWidth;
                        let snappedHeight = newHeight;
                        let snapW = false;
                        let snapH = false;

                        // 缩放右边缘 X 轴吸附
                        const currentRight = leftVal + newWidth;
                        for (const refX of xRefs) {
                            if (Math.abs(currentRight - refX) < SNAP_THRESH) {
                                snappedWidth = refX - leftVal;
                                activeLines.push({ type: 'v', val: refX });
                                snapW = true;
                                break;
                            }
                        }

                        // 缩放底边缘 Y 轴吸附
                        const currentBottom = topVal + newHeight;
                        for (const refY of yRefs) {
                            if (Math.abs(currentBottom - refY) < SNAP_THRESH) {
                                snappedHeight = refY - topVal;
                                activeLines.push({ type: 'h', val: refY });
                                snapH = true;
                                break;
                            }
                        }

                        if (!snapW && snapSize > 0) {
                            snappedWidth = Math.round(newWidth / snapSize) * snapSize;
                        }
                        if (!snapH && snapSize > 0) {
                            snappedHeight = Math.round(newHeight / snapSize) * snapSize;
                        }

                        snappedWidth = Math.max(5, Math.min(100 - leftVal, snappedWidth));
                        snappedHeight = Math.max(5, Math.min(100 - topVal, snappedHeight));

                        return {
                            ...el,
                            style: {
                                ...el.style,
                                width: `${snappedWidth.toFixed(2)}%`,
                                height: `${snappedHeight.toFixed(2)}%`
                            }
                        };
                    }
                    return el;
                });

                // 异步防 React 重绘冲突警告
                setTimeout(() => setAlignLines(activeLines), 0);

                return updated;
            });
        };

        const handleMouseUp = () => {
            dragStateRef.current = null;
            setAlignLines([]); // 释放时自动清空辅助参考线
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [snapSize]);

    // 开始拖拽
    const handleStartDrag = (e: React.MouseEvent, elementId: string) => {
        e.preventDefault();
        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        setSelectedId(elementId);
        pushHistory(elements, elementId);

        dragStateRef.current = {
            elementId,
            type: 'drag',
            startX: e.clientX,
            startY: e.clientY,
            initLeft: parseFloat(element.style.left),
            initTop: parseFloat(element.style.top),
            initWidth: parseFloat(element.style.width),
            initHeight: parseFloat(element.style.height)
        };
    };

    // 开始拉伸
    const handleStartResize = (e: React.MouseEvent, elementId: string) => {
        e.stopPropagation();
        e.preventDefault();
        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        pushHistory(elements, elementId);

        dragStateRef.current = {
            elementId,
            type: 'resize',
            startX: e.clientX,
            startY: e.clientY,
            initLeft: parseFloat(element.style.left),
            initTop: parseFloat(element.style.top),
            initWidth: parseFloat(element.style.width),
            initHeight: parseFloat(element.style.height)
        };
    };
    // #endregion

    // #region Layout Mutations
    // 添加图片插槽
    const addPhotoSlot = () => {
        pushHistory(elements, selectedId);

        const photoIndexes = elements
            .filter(el => el.type === 'photo')
            .map(el => el.slotIndex ?? 0);
        const nextIndex = photoIndexes.length > 0 ? Math.max(...photoIndexes) + 1 : 0;

        const newElement: LayoutElement = {
            id: `photo-${Date.now()}`,
            type: 'photo',
            slotIndex: nextIndex,
            style: {
                left: '20.00%',
                top: '20.00%',
                width: '40.00%',
                height: '30.00%',
                borderRadius: '8px',
                borderWidth: '0px'
            }
        };

        setElements(prev => [...prev, newElement]);
        setSelectedId(newElement.id);
    };

    // 添加文本插槽
    const addTextSlot = () => {
        pushHistory(elements, selectedId);

        const newElement: LayoutElement = {
            id: `text-${Date.now()}`,
            type: 'text',
            role: 'page-content',
            style: {
                left: '20.00%',
                top: '60.00%',
                width: '60.00%',
                height: '15.00%',
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#1E293B',
                textAlign: 'left',
                fontWeight: 'normal',
                borderRadius: '0px',
                borderWidth: '0px'
            }
        };

        setElements(prev => [...prev, newElement]);
        setSelectedId(newElement.id);
    };

    // 删除当前选中插槽
    const deleteSelectedElement = () => {
        if (!selectedId) return;
        pushHistory(elements, selectedId);
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
    };

    // 清空画布
    const clearCanvas = () => {
        if (window.confirm('确定要清空画布上的所有插槽吗？')) {
            pushHistory(elements, selectedId);
            setElements([]);
            setSelectedId(null);
        }
    };

    // 更新选中插槽的特定样式属性 (无历史压栈，配合 SliderStart 使用)
    const updateSelectedStyle = (key: keyof React.CSSProperties | string, value: any) => {
        if (!selectedId) return;
        setElements(prev => prev.map(el => {
            if (el.id !== selectedId) return el;
            return {
                ...el,
                style: {
                    ...el.style,
                    [key]: value
                }
            };
        }));
    };

    // 更新选中插槽的业务属性 (role, slotIndex)
    const updateSelectedAttr = (key: 'role' | 'slotIndex', value: any) => {
        if (!selectedId) return;
        pushHistory(elements, selectedId);
        setElements(prev => prev.map(el => {
            if (el.id !== selectedId) return el;
            return {
                ...el,
                [key]: value
            };
        }));
    };

    // 图层深度置于顶层
    const bringToFront = () => {
        if (!selectedId) return;
        pushHistory(elements, selectedId);
        const zIndexes = elements.map(el => el.style.zIndex ?? 10);
        const maxZ = Math.max(...zIndexes, 10);
        updateSelectedStyle('zIndex', maxZ + 1);
    };

    // 图层深度置于底层
    const sendToBack = () => {
        if (!selectedId) return;
        pushHistory(elements, selectedId);
        const zIndexes = elements.map(el => el.style.zIndex ?? 10);
        const minZ = Math.min(...zIndexes, 10);
        updateSelectedStyle('zIndex', Math.max(1, minZ - 1));
    };
    // #endregion

    // #region Save to Database
    // 保存并发布模板到数据库
    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            setErrorMessage('请输入排版模板名称');
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        // 计算照片槽总数
        const photoCount = elements.filter(el => el.type === 'photo').length;

        // 构造 Schema
        const layoutSchema: LayoutSchema = {
            background: {
                color: '#FFFFFF',
                gridPattern: false
            },
            elements
        };

        const templateId = currentTemplateId || `tpl-${Date.now()}`;

        const templateData: Template = {
            id: templateId,
            name: templateName,
            photoCount,
            category: templateCategory,
            templateType,
            layoutSchema,
            visibility,
            creatorId: user?.role === 'admin' ? creatorId : (user?.id || 'system')
        };

        try {
            await axios.post('/templates', templateData);
            setSuccessMessage(currentTemplateId ? '排版模板更新成功' : '新排版模板保存成功！');
            setAutoSaveStatus('synced');
            if (!currentTemplateId) {
                setTimeout(() => {
                    const redirectUrl = `/editor/template/${templateId}`;
                    setCurrentTemplateId(templateId);
                    navigate(redirectUrl);
                }, 1500);
            }
        } catch (error: any) {
            console.error('Failed to save template:', error);
            setErrorMessage(error.response?.data?.error || '发布失败，请检查网络或参数设置。');
        } finally {
            setIsSaving(false);
        }
    };
    // #endregion

    // #region Render Inspector Components
    // 渲染定位尺寸滑块与输入组件
    const renderCoordinateSlider = (label: string, styleKey: string, max = 100) => {
        if (!selectedElement) return null;
        const valueStr = (selectedElement.style as any)[styleKey] || '0%';
        const valNum = parseFloat(valueStr) || 0;

        return (
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                    <span>{label}</span>
                    <span className="text-indigo-600 font-extrabold text-xs">{valNum.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0"
                        max={max}
                        step="0.5"
                        value={valNum}
                        onMouseDown={handleSliderStart}
                        onChange={(e) => {
                            updateSelectedStyle(styleKey, `${parseFloat(e.target.value).toFixed(2)}%`);
                        }}
                        className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                    />
                    <input
                        type="number"
                        min="0"
                        max={max}
                        step="0.5"
                        value={parseFloat(valNum.toFixed(1))}
                        onFocus={handleSliderStart}
                        onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            updateSelectedStyle(styleKey, `${isNaN(parsed) ? 0 : parsed}%`);
                        }}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-200/80 text-xs font-bold rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                    />
                </div>
            </div>
        );
    };

    // 渲染圆角滑块与快捷切换组件
    const renderBorderRadiusControl = () => {
        if (!selectedElement) return null;
        const radiusStr = selectedElement.style.borderRadius || '0px';
        const isCircle = radiusStr === '50%';
        const radiusNum = isCircle ? 50 : (parseInt(radiusStr) || 0);

        return (
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                    <span>边缘圆角</span>
                    <span className="text-indigo-600 font-extrabold text-xs">{isCircle ? '圆形 (50%)' : `${radiusNum}px`}</span>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0"
                        max={50}
                        step="2"
                        value={radiusNum}
                        onMouseDown={handleSliderStart}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val >= 48) {
                                updateSelectedStyle('borderRadius', '50%');
                            } else {
                                updateSelectedStyle('borderRadius', `${val}px`);
                            }
                        }}
                        className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                    />
                    <button
                        onClick={() => {
                            pushHistory(elements, selectedId);
                            updateSelectedStyle('borderRadius', isCircle ? '0px' : '50%');
                        }}
                        className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all shrink-0 ${isCircle
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        一键圆形
                    </button>
                </div>
            </div>
        );
    };

    // 渲染边框粗细滑块组件
    const renderBorderWidthControl = () => {
        if (!selectedElement) return null;
        const widthStr = selectedElement.style.borderWidth || '0px';
        const widthNum = parseInt(widthStr) || 0;

        return (
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                    <span>边框粗细</span>
                    <span className="text-indigo-600 font-extrabold text-xs">{widthNum}px</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max={10}
                    value={widthNum}
                    onMouseDown={handleSliderStart}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateSelectedStyle('borderWidth', `${val}px`);
                        if (val > 0 && (!selectedElement.style.borderStyle || selectedElement.style.borderStyle === 'none')) {
                            updateSelectedStyle('borderStyle', 'solid');
                        }
                    }}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
            </div>
        );
    };

    // 渲染边框细节配置
    const renderBorderStyleAndColor = () => {
        if (!selectedElement) return null;
        const borderStyle = selectedElement.style.borderStyle || 'none';
        const borderColor = selectedElement.style.borderColor || '#3B82F6';

        return (
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">边框样式</label>
                    <select
                        value={borderStyle}
                        onChange={(e) => {
                            pushHistory(elements, selectedId);
                            updateSelectedStyle('borderStyle', e.target.value);
                        }}
                        className="px-2 py-2 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg focus:outline-none text-slate-700"
                    >
                        <option value="none">无边框</option>
                        <option value="solid">实线 (Solid)</option>
                        <option value="dashed">虚线 (Dashed)</option>
                        <option value="dotted">点线 (Dotted)</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">边框颜色</label>
                    <div className="flex items-center gap-1.5">
                        <input
                            type="color"
                            value={borderColor}
                            onChange={(e) => {
                                updateSelectedStyle('borderColor', e.target.value);
                            }}
                            onMouseDown={handleSliderStart}
                            className="w-7 h-7 rounded border border-slate-200 cursor-pointer shrink-0"
                        />
                        <input
                            type="text"
                            value={borderColor}
                            onChange={(e) => {
                                updateSelectedStyle('borderColor', e.target.value);
                            }}
                            onFocus={handleSliderStart}
                            className="w-full min-w-0 px-2 py-1 bg-slate-50 border border-slate-200 text-[10px] font-mono font-bold rounded-lg text-slate-800"
                        />
                    </div>
                </div>
            </div>
        );
    };

    // 渲染物理拟真阴影开关
    const renderShadowControl = () => {
        if (!selectedElement) return null;
        const hasShadow = !!selectedElement.style.boxShadow;

        return (
            <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">启用纸面阴影</span>
                    <span className="text-[9px] text-slate-400 font-medium">为插槽添加轻微叠纸阴影</span>
                </div>
                <button
                    onClick={() => {
                        pushHistory(elements, selectedId);
                        updateSelectedStyle(
                            'boxShadow',
                            hasShadow ? '' : '0 6px 16px rgba(15,23,42,0.06)'
                        );
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${hasShadow ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${hasShadow ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                </button>
            </div>
        );
    };

    // 渲染图层层级控制
    const renderLayerControl = () => {
        if (!selectedElement) return null;

        return (
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">图层深度 (Depth)</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={bringToFront}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                        <ArrowUp size={12} />
                        置于顶层
                    </button>
                    <button
                        onClick={sendToBack}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                        <ArrowDown size={12} />
                        置于底层
                    </button>
                </div>
            </div>
        );
    };
    // #endregion


    return (
        <div className="w-screen h-screen overflow-hidden flex flex-col bg-slate-50 relative select-none animate-in fade-in duration-200 font-sans">

            {/* 顶部高定设计工具条 Header (完美匹配 Editor.tsx 风格) */}
            <div id="editor-top-bar" className="h-14 w-full bg-white border-b border-gray-200/80 px-6 flex items-center justify-between z-50 shadow-sm flex-shrink-0">

                {/* Left Section: Back & Page Template Mode Indicator */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/workbench?tab=designs')}
                        className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl transition-all flex items-center justify-center active:scale-95 border border-slate-200/80 bg-white shadow-sm cursor-pointer"
                        title="返回设计模板库"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="h-4 w-px bg-gray-200" />

                    {/* Mode Label */}
                    <div className="flex bg-slate-100 p-0.5 rounded-full border border-slate-200/50 shadow-inner shrink-0 select-none">
                        <span className="px-3.5 py-0.5 rounded-full text-[10px] font-black bg-white text-indigo-650 shadow-sm">
                            页模板设计
                        </span>
                    </div>

                    <div className="h-4 w-px bg-gray-200" />

                    {/* Name Input */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => {
                                setTemplateName(e.target.value);
                                setIsNameManuallyEdited(true);
                            }}
                            placeholder="给页模板起个名字..."
                            className="px-3 py-1 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 focus:bg-white focus:border-indigo-500 border border-slate-150 rounded-lg text-xs font-bold text-slate-800 transition-all focus:outline-none min-w-[150px] max-w-[240px]"
                        />
                    </div>

                    <div className="h-4 w-px bg-gray-200" />

                    {/* Cloud Sync Status Indicator */}
                    {autoSaveStatus === 'synced' && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            已保存
                        </span>
                    )}
                    {autoSaveStatus === 'saving' && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-none">
                            <Loader2 size={10} className="animate-spin text-blue-500" />
                            正在同步...
                        </span>
                    )}
                    {autoSaveStatus === 'dirty' && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-450 inline-block animate-pulse" />
                            有未保存的修改
                        </span>
                    )}
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-3">
                    {/* Undo/Redo */}
                    <button
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-full text-gray-500 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
                        title="撤销操作 (Ctrl + Z)"
                    >
                        <Undo2 size={13} />
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-full text-gray-500 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
                        title="重做操作 (Ctrl + Y)"
                    >
                        <Redo2 size={13} />
                    </button>

                    <div className="w-px h-4 bg-gray-200" />

                    {/* Save Template Button */}
                    <button
                        onClick={handleSaveTemplate}
                        disabled={isSaving}
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-indigo-650 px-3.5 py-1.5 rounded-full transition-all text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 size={12} className="animate-spin text-indigo-655" />
                        ) : (
                            <Save size={12} />
                        )}
                        <span>保存设计</span>
                    </button>
                </div>
            </div>

            {/* 编辑器主工作区 (无左侧目录) */}
            <main className="flex-1 flex w-full overflow-hidden relative">

                {/* 中间 A4 独立工作台画布 Canvas (背景与 Editor.tsx 保持一致的灰色 #DEDEE2) */}
                <div
                    className="flex-1 relative overflow-auto flex items-center justify-center p-8 bg-[#DEDEE2] custom-scrollbar select-none"
                    onClick={() => setSelectedId(null)}
                >
                    {/* 画布底板容器以维持 A4 比例大小 */}
                    <div className="relative pointer-events-auto">

                        {/* 画布上方的快捷工具栏 */}
                        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between bg-white border border-slate-200/80 shadow-md rounded-2xl px-4 py-2 shrink-0 z-40">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">工具箱:</span>
                                <button
                                    onClick={addPhotoSlot}
                                    className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-95"
                                    title="添加照片插槽"
                                >
                                    <ImageIcon size={14} className="text-blue-500" />
                                </button>
                                <button
                                    onClick={addTextSlot}
                                    className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-95"
                                    title="添加文字插槽"
                                >
                                    <Type size={14} className="text-amber-500" />
                                </button>
                            </div>

                            <div className="w-[1px] h-4 bg-slate-200 mx-2"></div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setShowGrid(!showGrid)}
                                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-95 ${showGrid ? 'bg-indigo-50 text-indigo-750' : 'hover:bg-slate-50 text-slate-400 hover:text-slate-700'
                                        }`}
                                    title="开关网格辅助线"
                                >
                                    <Grid size={14} />
                                </button>
                                <button
                                    onClick={clearCanvas}
                                    className="p-1.5 hover:bg-rose-50 text-slate-450 hover:text-rose-600 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-95"
                                    title="清空画布"
                                >
                                    <RotateCcw size={14} />
                                </button>
                            </div>
                        </div>

                        {/* A4 纵横比物理画布 */}
                        <div
                            ref={canvasRef}
                            className="bg-white relative overflow-hidden select-none border border-slate-250 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.08)] transition-colors duration-300 rounded-[4px]"
                            style={{
                                width: '380px',
                                height: '537px', // A4 纸张比例 210:297 (1:1.414)
                                backgroundColor: canvasMaterial === 'warm'
                                    ? '#FAF6EE'
                                    : canvasMaterial === 'kraft'
                                        ? '#F5EAD4'
                                        : '#FFFFFF',
                                backgroundImage: canvasMaterial === 'dots' || (showGrid && canvasMaterial === 'white')
                                    ? 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 1.2px, transparent 1.2px)'
                                    : canvasMaterial === 'lines'
                                        ? 'linear-gradient(to bottom, transparent 95%, rgba(148, 163, 184, 0.15) 95%)'
                                        : 'none',
                                backgroundSize: canvasMaterial === 'lines' ? '100% 24px' : '20px 20px'
                            }}
                            onClick={() => setSelectedId(null)}
                        >
                            {/* 物理中心辅助线 */}
                            {showGrid && (
                                <>
                                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-indigo-200/50 pointer-events-none"></div>
                                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-indigo-200/50 pointer-events-none"></div>
                                    {/* 安全留白边距 (5%) */}
                                    <div className="absolute inset-[5%] border border-dashed border-slate-200/40 pointer-events-none rounded-sm"></div>
                                    <span className="absolute bottom-[2%] right-[5%] text-[7px] font-black text-slate-350 pointer-events-none">安全边线 5%</span>
                                </>
                            )}

                            {/* 智能对齐吸附辅助线 */}
                            {alignLines.map((line, idx) => (
                                <div
                                    key={idx}
                                    className={`absolute pointer-events-none z-40 border-dashed border-indigo-500 ${line.type === 'v'
                                        ? 'top-0 bottom-0 border-l'
                                        : 'left-0 right-0 border-t'
                                        }`}
                                    style={line.type === 'v' ? { left: `${line.val}%` } : { top: `${line.val}%` }}
                                />
                            ))}

                            {/* 渲染插槽元素 */}
                            {elements.map((el) => {
                                const isSelected = el.id === selectedId;
                                return (
                                    <div
                                        key={el.id}
                                        onMouseDown={(e) => handleStartDrag(e, el.id)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedId(el.id);
                                            // 选中元素时，自动切到属性 Tab 且打开 drawer
                                            setActiveTab('inspector');
                                            setIsDrawerOpen(true);
                                        }}
                                        className={`absolute flex flex-col group select-none transition-shadow ${isSelected
                                            ? 'ring-2 ring-indigo-600 ring-offset-0 z-30 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.15)] bg-slate-50'
                                            : 'border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-slate-50/30 z-20 bg-transparent'
                                            }`}
                                        style={{
                                            left: el.style.left,
                                            top: el.style.top,
                                            width: el.style.width,
                                            height: el.style.height,
                                            borderRadius: el.style.borderRadius || '0px',
                                            borderWidth: el.style.borderWidth || '0px',
                                            borderStyle: el.style.borderStyle || 'none',
                                            borderColor: el.style.borderColor || 'transparent',
                                            boxShadow: el.style.boxShadow || 'none'
                                        }}
                                    >
                                        {/* 占位标记内容 */}
                                        {el.type === 'photo' ? (
                                            <PhotoPlaceholder />
                                        ) : (
                                            <TextPlaceholder role={el.role} />
                                        )}

                                        {/* 气泡悬浮信息 - 仅选中时展示 */}
                                        {isSelected && (
                                            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-[10px] text-slate-50 font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap pointer-events-none z-50 animate-in fade-in duration-200">
                                                {el.style.width} × {el.style.height}
                                            </div>
                                        )}

                                        {/* 缩放手柄 - 仅选中时展示 */}
                                        {isSelected && (
                                            <div
                                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-indigo-650 border border-white cursor-se-resize flex items-center justify-center shadow-md active:scale-90 rounded-tl-md z-50"
                                                onMouseDown={(e) => handleStartResize(e, el.id)}
                                                title="拉伸调整大小"
                                            >
                                                <span className="block w-1.5 h-1.5 border-r border-b border-white"></span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 画布材质背景选择器 (悬浮左下角胶囊) */}
                        <div className="absolute bottom-6 left-6 bg-white/95 border border-slate-200/60 shadow-md rounded-full px-2.5 py-1.5 flex items-center gap-1.5 z-40 select-none">
                            <span className="text-[10px] font-black text-slate-400 px-1">纸张质感:</span>
                            {[
                                { id: 'white', label: '白', color: '#FFFFFF', title: '纯白书页' },
                                { id: 'warm', label: '暖', color: '#FAF6EE', title: '淡雅暖白' },
                                { id: 'kraft', label: '牛', color: '#F5EAD4', title: '经典牛皮' },
                                { id: 'dots', label: '点', color: '#E2E8F0', title: '点阵对齐' },
                                { id: 'lines', label: '线', color: '#CBD5E1', title: '横向书写' }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setCanvasMaterial(m.id as any)}
                                    className={`w-5 h-5 rounded-full border text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${canvasMaterial === m.id
                                        ? 'ring-2 ring-indigo-500 border-white font-extrabold shadow-sm'
                                        : 'border-slate-200 text-slate-655 hover:bg-slate-50'
                                        }`}
                                    style={m.id !== 'dots' && m.id !== 'lines' ? { backgroundColor: m.color } : {}}
                                    title={m.title}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                    </div>
                </div>

                {/* 3. 右侧 Dock + Drawer 栏 (完美复用主书编辑器的两级面板抽屉架构) */}

                {/* 3.1 Drawer Panel */}
                {isDrawerOpen && activeTab && (
                    <aside className="w-80 border-l border-gray-200/80 bg-white flex flex-col z-20 shadow-sm animate-in slide-in-from-right-3 duration-200 h-full">
                        <div className="h-12 border-b border-slate-100 px-4 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                            <span className="text-xs font-black text-slate-700 tracking-wider">
                                {activeTab === 'presets' && '排版预设'}
                                {activeTab === 'elements' && '图层与新增'}
                                {activeTab === 'inspector' && '插槽修饰'}
                                {activeTab === 'global' && '全局模板配置'}
                            </span>
                            <button
                                onClick={() => {
                                    setIsDrawerOpen(false);
                                    setActiveTab(null);
                                }}
                                className="text-slate-400 hover:text-slate-655 p-1 text-xs font-bold"
                            >
                                收起 →
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                            {/* TAB: Presets */}
                            {activeTab === 'presets' && (
                                <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                                    <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-1">选择排版预设</div>
                                    {LAYOUT_PRESETS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (elements.length > 0 && !window.confirm('应用预设将覆盖画布上的所有现有元素，确定应用吗？')) {
                                                    return;
                                                }
                                                pushHistory(elements, selectedId);
                                                const newElements = preset.elements.map(el => ({
                                                    ...el,
                                                    id: `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                                                }));
                                                setElements(newElements);
                                                setSelectedId(null);
                                            }}
                                            className="p-3.5 bg-white hover:bg-indigo-50/20 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer shadow-sm"
                                        >
                                            <div>
                                                <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-655 transition-colors block mb-1">
                                                    {preset.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 leading-normal">
                                                    {preset.description}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] font-black text-slate-400 group-hover:text-indigo-500 mt-2.5 border-t border-slate-100 pt-1.5 w-full">
                                                <span>照片: {preset.photoCount} 张</span>
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">快速应用 →</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* TAB: Elements / Layers */}
                            {activeTab === 'elements' && (
                                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                                    <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-1">添加新插槽</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={addPhotoSlot}
                                            className="p-3.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-[0.98] cursor-pointer group shadow-sm bg-white"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-650 group-hover:scale-105 transition-transform">
                                                <ImageIcon size={16} />
                                            </div>
                                            <div className="text-xs font-bold text-slate-700">照片插槽</div>
                                        </button>

                                        <button
                                            onClick={addTextSlot}
                                            className="p-3.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-[0.98] cursor-pointer group shadow-sm bg-white"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-655 group-hover:scale-105 transition-transform">
                                                <Type size={16} />
                                            </div>
                                            <div className="text-xs font-bold text-slate-700">文本插槽</div>
                                        </button>
                                    </div>

                                    <div className="h-[1px] bg-slate-100 my-2" />

                                    <div className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-1">设计图层树 ({elements.length})</div>
                                    {elements.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 text-xs font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                            画布上还没有插槽元素<br />
                                            应用预设或点击上方按钮新增
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            {elements.map((el, index) => {
                                                const isSelected = el.id === selectedId;
                                                return (
                                                    <div
                                                        key={el.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedId(el.id);
                                                        }}
                                                        className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${isSelected
                                                            ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 shadow-sm font-bold'
                                                            : 'bg-white border-slate-150 text-slate-655 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-[10px] font-mono text-slate-400 shrink-0">#{index + 1}</span>
                                                            {el.type === 'photo' ? (
                                                                <ImageIcon size={12} className="text-blue-500 shrink-0" />
                                                            ) : (
                                                                <Type size={12} className="text-amber-500 shrink-0" />
                                                            )}
                                                            <span className="truncate text-slate-700">
                                                                {el.type === 'photo'
                                                                    ? `图片插槽 (Slot #${el.slotIndex})`
                                                                    : `文字角色 (${el.role === 'chapter-title' ? '标题' : el.role === 'chapter-date' ? '时间' : '正文'})`
                                                                }
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                pushHistory(elements, selectedId);
                                                                setElements(prev => prev.filter(item => item.id !== el.id));
                                                                if (selectedId === el.id) setSelectedId(null);
                                                            }}
                                                            className="text-slate-350 hover:text-rose-600 transition-colors p-1"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: Inspector (Properties) */}
                            {activeTab === 'inspector' && (
                                <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                                    {selectedElement ? (
                                        <div className="flex flex-col gap-5">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${selectedElement.type === 'photo'
                                                    ? 'bg-blue-50 text-blue-750'
                                                    : 'bg-amber-50 text-amber-750'
                                                    }`}>
                                                    {selectedElement.type === 'photo' ? '图片插槽' : '文字插槽'}
                                                </span>
                                                <button
                                                    onClick={deleteSelectedElement}
                                                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                                                    title="删除选中插槽"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* 1. Coordinates and Size */}
                                            <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-55 pb-1.5">定位尺寸 (%)</div>
                                                {renderCoordinateSlider("横坐标 (Left)", "left")}
                                                {renderCoordinateSlider("纵坐标 (Top)", "top")}
                                                {renderCoordinateSlider("宽度 (Width)", "width")}
                                                {renderCoordinateSlider("高度 (Height)", "height")}
                                            </div>

                                            {/* 2. Styling effects */}
                                            <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-55 pb-1.5">物理修饰</div>
                                                {renderBorderRadiusControl()}
                                                {renderBorderWidthControl()}
                                                {renderBorderStyleAndColor()}
                                                {renderShadowControl()}
                                                {renderLayerControl()}
                                            </div>

                                            {/* 3. Photo-only settings */}
                                            {selectedElement.type === 'photo' && (
                                                <div className="flex flex-col gap-2.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">照片索引绑定 (Slot Index)</label>
                                                    <select
                                                        value={selectedElement.slotIndex ?? 0}
                                                        onChange={(e) => updateSelectedAttr('slotIndex', parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                                                    >
                                                        {[0, 1, 2, 3, 4, 5, 6].map(idx => (
                                                            <option key={idx} value={idx}>插槽 #{idx} (对应单页第 {idx + 1} 张图)</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[9px] text-slate-455 font-medium leading-relaxed">注意：页模板内不同照片插槽的索引应该唯一，以便按顺序排入上传的照片。</p>
                                                </div>
                                            )}

                                            {/* 4. Text-only settings */}
                                            {selectedElement.type === 'text' && (
                                                <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-55 pb-1.5">文字样式</div>

                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">角色绑定 (Role)</label>
                                                        <select
                                                            value={selectedElement.role || 'page-content'}
                                                            onChange={(e) => updateSelectedAttr('role', e.target.value)}
                                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                                                        >
                                                            <option value="chapter-title">章节标题 (Chapter Title)</option>
                                                            <option value="chapter-date">章节时间 (Chapter Date)</option>
                                                            <option value="page-content">正文段落 (Page Content)</option>
                                                        </select>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-black text-slate-400">字体大小 (Size)</label>
                                                            <input
                                                                type="text"
                                                                value={selectedElement.style.fontSize || '14px'}
                                                                onChange={(e) => updateSelectedStyle('fontSize', e.target.value)}
                                                                placeholder="例: 14px"
                                                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg focus:outline-none"
                                                            />
                                                        </div>

                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-black text-slate-400">行高 (Line Height)</label>
                                                            <input
                                                                type="text"
                                                                value={selectedElement.style.lineHeight || '1.6'}
                                                                onChange={(e) => updateSelectedStyle('lineHeight', e.target.value)}
                                                                placeholder="例: 1.6"
                                                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-black text-slate-400">对齐方式 (Align)</label>
                                                            <select
                                                                value={selectedElement.style.textAlign || 'left'}
                                                                onChange={(e) => updateSelectedStyle('textAlign', e.target.value)}
                                                                className="px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg focus:outline-none text-slate-700 cursor-pointer"
                                                            >
                                                                <option value="left">居左</option>
                                                                <option value="center">居中</option>
                                                                <option value="right">居右</option>
                                                            </select>
                                                        </div>

                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-black text-slate-400">字重 (Weight)</label>
                                                            <select
                                                                value={selectedElement.style.fontWeight || 'normal'}
                                                                onChange={(e) => updateSelectedStyle('fontWeight', e.target.value)}
                                                                className="px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg focus:outline-none text-slate-700 cursor-pointer"
                                                            >
                                                                <option value="normal">正常</option>
                                                                <option value="bold">粗体 (Bold)</option>
                                                                <option value="500">中等 (500)</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">文字颜色</label>
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="color"
                                                                value={selectedElement.style.color || '#1E293B'}
                                                                onChange={(e) => updateSelectedStyle('color', e.target.value)}
                                                                onMouseDown={handleSliderStart}
                                                                className="w-7 h-7 rounded border border-slate-200 cursor-pointer shrink-0"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={selectedElement.style.color || '#1E293B'}
                                                                onChange={(e) => updateSelectedStyle('color', e.target.value)}
                                                                onFocus={handleSliderStart}
                                                                className="w-full min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 text-[10px] font-mono font-bold rounded-lg text-slate-800 focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                            请在画布上选中一个插槽<br />
                                            即可在此调节插槽修饰属性
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: Global Template Configuration */}
                            {activeTab === 'global' && (
                                <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                                    {/* 模板通用设置 */}
                                    <div className="flex flex-col gap-5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b border-slate-55 pb-2 flex items-center gap-1.5">
                                            <Settings size={14} className="text-indigo-650" />
                                            模板基础属性
                                        </h3>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">模板功能页类别 (Type)</label>
                                                <select
                                                    value={templateType}
                                                    onChange={(e) => setTemplateType(e.target.value as any)}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                                                >
                                                    <option value="content">正文内容页 (Content)</option>
                                                    <option value="cover">封皮排版页 (Cover)</option>
                                                    <option value="preface">前言说明页 (Preface)</option>
                                                    <option value="structural">过渡章页 (Structural)</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">排版分类 (Category)</label>
                                                <select
                                                    value={templateCategory}
                                                    onChange={(e) => setTemplateCategory(e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                                                >
                                                    <option value="general">通用模板</option>
                                                    <option value="travel">旅行叙事</option>
                                                    <option value="journal">精美手帐</option>
                                                    <option value="family">温馨家庭</option>
                                                    <option value="minimalist">现代极简</option>
                                                    <option value="retro">文艺复古</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">共享设置 (Visibility)</label>
                                                <select
                                                    value={visibility}
                                                    onChange={(e) => setVisibility(e.target.value as any)}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                                                >
                                                    {user?.role === 'admin' ? (
                                                        <>
                                                            <option value="public">系统精选 (全员公开)</option>
                                                            <option value="private">仅限私有 (测试调试)</option>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="private">仅自己可见 (我的设计)</option>
                                                            <option value="public">分享到精选 (公开共享)</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 吸附精度网格设置 */}
                                    <div className="flex flex-col gap-5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b border-slate-55 pb-2 flex items-center gap-1.5">
                                            <Grid size={14} className="text-indigo-650" />
                                            物理辅助磁力吸附
                                        </h3>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">网格吸附颗粒度 (Snap Grid)</label>
                                            <select
                                                value={snapSize}
                                                onChange={(e) => setSnapSize(parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none cursor-pointer text-slate-700"
                                            >
                                                <option value={0}>禁用吸附 (任意移动)</option>
                                                <option value={1}>精细吸附 (1%)</option>
                                                <option value={2.5}>标准吸附 (2.5%)</option>
                                                <option value={5}>强力吸附 (5%)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                )}

                {/* 3.2 Right Icon Dock */}
                <div className="w-16 bg-[#F8F9FA] border-l border-gray-200/80 flex flex-col items-center py-4 gap-5 select-none shrink-0 h-full z-10 shadow-[inset_1px_0_0_0_rgba(0,0,0,0.02)]">
                    {[
                        { id: 'presets' as const, label: '排版预设', icon: <LayoutTemplate size={20} /> },
                        { id: 'elements' as const, label: '图层新增', icon: <Layers size={20} /> },
                        { id: 'inspector' as const, label: '插槽修饰', icon: <Sliders size={20} />, dot: !!selectedId },
                        { id: 'global' as const, label: '全局配置', icon: <Settings size={20} /> }
                    ].map((item) => {
                        const isActive = activeTab === item.id && isDrawerOpen;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (activeTab === item.id && isDrawerOpen) {
                                        setIsDrawerOpen(false);
                                        setActiveTab(null);
                                    } else {
                                        setActiveTab(item.id);
                                        setIsDrawerOpen(true);
                                    }
                                }}
                                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${isActive
                                    ? 'bg-indigo-650 text-white shadow-md shadow-indigo-100 scale-105 font-bold'
                                    : 'bg-white hover:bg-indigo-50/45 text-gray-500 hover:text-indigo-600 border border-gray-200/60 shadow-sm'
                                    }`}
                                title={item.label}
                            >
                                {item.icon}
                                <span className={`text-[8px] font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>
                                {item.dot && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-550 border-2 border-white rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

            </main>

            {/* 底部悬浮 Toast 提醒消息 */}
            {(errorMessage || successMessage) && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {errorMessage && (
                        <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-lg">
                            <AlertCircle size={16} className="text-rose-500 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                    {successMessage && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-lg animate-pulse">
                            <Check size={16} className="text-emerald-500 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
