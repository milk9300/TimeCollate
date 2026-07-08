// #region Description
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parseColor, hsvToRgb, rgbToHex, rgbToHsv, type ColorState, isGradientColor, parseGradient, serializeGradient } from '../../../utils/colorUtils';
import { Pipette } from 'lucide-react';

/**
 * 默认书籍基础背景配色
 */
const PRESET_BACKGROUNDS = [
    { color: '#FFFFFF', name: '纯白' },
    { color: '#FAF5EC', name: '暖沙' },
    { color: '#ECE3D3', name: '复古' },
    { color: '#FDFCF7', name: '绘本' },
    { color: '#18181B', name: '暗夜' }
];

/**
 * 精选莫兰迪/复古回忆手册推荐色板
 */
const PRESET_COLORS = [
    '#F87171', // 珊瑚粉
    '#FB923C', // 暖阳橘
    '#FBBF24', // 柠檬黄
    '#34D399', // 薄荷绿
    '#60A5FA', // 天蓝色
    '#818CF8', // 薰衣草
    '#C084FC', // 梦幻紫
    '#EC4899', // 玫瑰红
    '#64748B', // 雅致灰
    '#334155'  // 深色蓝
];

/**
 * 精选线性渐变色预设
 */
const PRESET_GRADIENTS = [
    { name: '雅致紫', value: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' },
    { name: '暖阳橘', value: 'linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)' },
    { name: '薄荷绿', value: 'linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)' },
    { name: '海洋蓝', value: 'linear-gradient(135deg, #21D4FD 0%, #B721FF 100%)' },
    { name: '樱花粉', value: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)' },
    { name: '日落红', value: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)' }
];

const LOCAL_STORAGE_KEY = 'timecollate_recent_colors';
const MAX_RECENT_COUNT = 16;


// #region ColorPickerPanel 核心面板Props接口
interface ColorPickerPanelProps {
    color: string;
    onChange: (color: string) => void;
    showAlpha?: boolean;
    onInteractiveStart?: () => void;
    onInteractiveEnd?: () => void;
}
// #endregion

/**
 * @description 颜色选择控制面板
 */
export const ColorPickerPanel: React.FC<ColorPickerPanelProps> = ({
    color,
    onChange,
    showAlpha = false,
    onInteractiveStart,
    onInteractiveEnd
}) => {
    const isGrad = isGradientColor(color);
    const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>(isGrad ? 'gradient' : 'solid');

    // 渐变临时状态
    const parsedGrad = parseGradient(isGrad ? color : '');
    const [gradAngle, setGradAngle] = useState(parsedGrad.angle);
    const [gradFrom, setGradFrom] = useState(parsedGrad.from);
    const [gradTo, setGradTo] = useState(parsedGrad.to);
    const [activeGradStop, setActiveGradStop] = useState<'from' | 'to'>('from');

    // 获取当前活跃的操作颜色
    const getActiveColor = useCallback(() => {
        if (activeTab === 'solid') return color;
        return activeGradStop === 'from' ? gradFrom : gradTo;
    }, [activeTab, color, activeGradStop, gradFrom, gradTo]);

    const colorState = parseColor(getActiveColor());

    // 内部独立维护 HSV 状态
    const [hsv, setHsv] = useState({ h: colorState.h, s: colorState.s, v: colorState.v });
    const [alpha, setAlpha] = useState(colorState.a);
    const [hexInput, setHexInput] = useState(colorState.hex);
    const [recentColors, setRecentColors] = useState<string[]>([]);

    // 容器 refs 用于拖拽定位计算
    const hsvPadRef = useRef<HTMLDivElement>(null);
    const hueSliderRef = useRef<HTMLDivElement>(null);
    const alphaSliderRef = useRef<HTMLDivElement>(null);

    // 加载最近使用颜色
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
                setRecentColors(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load recent colors:', e);
        }
    }, []);

    // 保存颜色到最近使用列表
    const saveToRecentColors = useCallback((newColor: string) => {
        const cleaned = newColor.trim();
        setRecentColors(prev => {
            const filtered = prev.filter(c => c !== cleaned);
            const updated = [cleaned, ...filtered].slice(0, MAX_RECENT_COUNT);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    // 监听外部 props 颜色变化同步内部状态
    useEffect(() => {
        const isGradProp = isGradientColor(color);
        if (isGradProp) {
            setActiveTab('gradient');
            const parsed = parseGradient(color);
            setGradAngle(parsed.angle);
            setGradFrom(parsed.from);
            setGradTo(parsed.to);

            const activeColor = activeGradStop === 'from' ? parsed.from : parsed.to;
            const nextState = parseColor(activeColor);
            const currentHex = rgbToHex(
                hsvToRgb(hsv.h, hsv.s, hsv.v).r,
                hsvToRgb(hsv.h, hsv.s, hsv.v).g,
                hsvToRgb(hsv.h, hsv.s, hsv.v).b,
                showAlpha ? alpha : 1
            );
            if (nextState.hex !== currentHex) {
                setHsv({ h: nextState.h, s: nextState.s, v: nextState.v });
                setAlpha(nextState.a);
                setHexInput(nextState.hex);
            }
        } else {
            setActiveTab('solid');
            const nextState = parseColor(color);
            const currentHex = rgbToHex(
                hsvToRgb(hsv.h, hsv.s, hsv.v).r,
                hsvToRgb(hsv.h, hsv.s, hsv.v).g,
                hsvToRgb(hsv.h, hsv.s, hsv.v).b,
                showAlpha ? alpha : 1
            );
            if (nextState.hex !== currentHex) {
                setHsv({ h: nextState.h, s: nextState.s, v: nextState.v });
                setAlpha(nextState.a);
                setHexInput(nextState.hex);
            }
            setGradFrom(color);
        }
    }, [color, showAlpha, activeGradStop]);

    // 切换控制点时更新 HSV 状态
    useEffect(() => {
        if (activeTab === 'gradient') {
            const activeColor = activeGradStop === 'from' ? gradFrom : gradTo;
            const parsed = parseColor(activeColor);
            setHsv({ h: parsed.h, s: parsed.s, v: parsed.v });
            setAlpha(parsed.a);
            setHexInput(parsed.hex);
        }
    }, [activeGradStop, activeTab, gradFrom, gradTo]);

    // 统一向上派发颜色变化事件
    const handleColorChange = useCallback((newH: number, newS: number, newV: number, newA: number) => {
        const rgb = hsvToRgb(newH, newS, newV);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b, showAlpha ? newA : 1);
        setHexInput(hex);

        if (activeTab === 'gradient') {
            if (activeGradStop === 'from') {
                setGradFrom(hex);
                onChange(serializeGradient(gradAngle, hex, gradTo));
            } else {
                setGradTo(hex);
                onChange(serializeGradient(gradAngle, gradFrom, hex));
            }
        } else {
            onChange(hex);
        }
    }, [onChange, showAlpha, activeTab, activeGradStop, gradAngle, gradFrom, gradTo]);

    // 一键应用颜色或渐变色
    const applyColor = useCallback((c: string) => {
        if (isGradientColor(c)) {
            setActiveTab('gradient');
            const parsed = parseGradient(c);
            setGradAngle(parsed.angle);
            setGradFrom(parsed.from);
            setGradTo(parsed.to);
            setActiveGradStop('from');
            const parsedColor = parseColor(parsed.from);
            setHsv({ h: parsedColor.h, s: parsedColor.s, v: parsedColor.v });
            setAlpha(parsedColor.a);
            setHexInput(parsedColor.hex);
            onChange(c);
            saveToRecentColors(c);
        } else {
            setActiveTab('solid');
            const parsed = parseColor(c);
            setHsv({ h: parsed.h, s: parsed.s, v: parsed.v });
            setAlpha(parsed.a);
            setHexInput(parsed.hex);
            onChange(c);
            saveToRecentColors(c);
        }
    }, [onChange, saveToRecentColors]);

    // HSV Pad 鼠标/触摸拖拽交互
    const handleHsvPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!hsvPadRef.current) return;
        e.preventDefault();
        hsvPadRef.current.setPointerCapture(e.pointerId);

        const rect = hsvPadRef.current.getBoundingClientRect();
        const updateCoord = (clientX: number, clientY: number) => {
            const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
            const newS = Math.round((x / rect.width) * 100);
            const newV = Math.round((1 - y / rect.height) * 100);
            setHsv({ h: hsv.h, s: newS, v: newV });
            handleColorChange(hsv.h, newS, newV, alpha);
        };

        if (onInteractiveStart) onInteractiveStart();

        updateCoord(e.clientX, e.clientY);

        const handlePointerMove = (ev: PointerEvent) => {
            updateCoord(ev.clientX, ev.clientY);
        };

        const handlePointerUp = (ev: PointerEvent) => {
            if (hsvPadRef.current) {
                try {
                    hsvPadRef.current.releasePointerCapture(ev.pointerId);
                } catch {}
            }
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);

            const finalRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
            const finalHex = rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b, showAlpha ? alpha : 1);

            if (activeTab === 'gradient') {
                const finalGrad = serializeGradient(gradAngle, activeGradStop === 'from' ? finalHex : gradFrom, activeGradStop === 'to' ? finalHex : gradTo);
                saveToRecentColors(finalGrad);
            } else {
                saveToRecentColors(finalHex);
            }
            if (onInteractiveEnd) onInteractiveEnd();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // Hue 彩虹滑动条拖拽交互
    const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!hueSliderRef.current) return;
        e.preventDefault();
        hueSliderRef.current.setPointerCapture(e.pointerId);

        const rect = hueSliderRef.current.getBoundingClientRect();
        const updateCoord = (clientX: number) => {
            const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const newH = Math.round((x / rect.width) * 360);
            setHsv(prev => ({ ...prev, h: newH }));
            handleColorChange(newH, hsv.s, hsv.v, alpha);
        };

        if (onInteractiveStart) onInteractiveStart();

        updateCoord(e.clientX);

        const handlePointerMove = (ev: PointerEvent) => {
            updateCoord(ev.clientX);
        };

        const handlePointerUp = (ev: PointerEvent) => {
            if (hueSliderRef.current) {
                try {
                    hueSliderRef.current.releasePointerCapture(ev.pointerId);
                } catch {}
            }
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);

            const finalRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
            const finalHex = rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b, showAlpha ? alpha : 1);
            if (activeTab === 'gradient') {
                const finalGrad = serializeGradient(gradAngle, activeGradStop === 'from' ? finalHex : gradFrom, activeGradStop === 'to' ? finalHex : gradTo);
                saveToRecentColors(finalGrad);
            } else {
                saveToRecentColors(finalHex);
            }
            if (onInteractiveEnd) onInteractiveEnd();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // Alpha 不透明度滑动条拖拽交互
    const handleAlphaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!alphaSliderRef.current) return;
        e.preventDefault();
        alphaSliderRef.current.setPointerCapture(e.pointerId);

        const rect = alphaSliderRef.current.getBoundingClientRect();
        const updateCoord = (clientX: number) => {
            const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const newA = parseFloat((x / rect.width).toFixed(2));
            setAlpha(newA);
            handleColorChange(hsv.h, hsv.s, hsv.v, newA);
        };

        if (onInteractiveStart) onInteractiveStart();

        updateCoord(e.clientX);

        const handlePointerMove = (ev: PointerEvent) => {
            updateCoord(ev.clientX);
        };

        const handlePointerUp = (ev: PointerEvent) => {
            if (alphaSliderRef.current) {
                try {
                    alphaSliderRef.current.releasePointerCapture(ev.pointerId);
                } catch {}
            }
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);

            const finalRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
            const finalHex = rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b, showAlpha ? alpha : 1);
            if (activeTab === 'gradient') {
                const finalGrad = serializeGradient(gradAngle, activeGradStop === 'from' ? finalHex : gradFrom, activeGradStop === 'to' ? finalHex : gradTo);
                saveToRecentColors(finalGrad);
            } else {
                saveToRecentColors(finalHex);
            }
            if (onInteractiveEnd) onInteractiveEnd();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // HEX 输入框打字中处理
    const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setHexInput(val);

        const cleaned = val.trim().replace(/^#/, '');
        if (cleaned.length === 6 || cleaned.length === 8 || cleaned.length === 3 || cleaned.length === 4) {
            const parsed = parseColor(val.startsWith('#') ? val : `#${val}`);
            if (parsed.hex !== '#FFFFFF' || cleaned.toLowerCase() === 'ffffff' || cleaned.toLowerCase() === 'fff') {
                setHsv({ h: parsed.h, s: parsed.s, v: parsed.v });
                setAlpha(parsed.a);
                if (activeTab === 'gradient') {
                    if (activeGradStop === 'from') {
                        setGradFrom(parsed.hex);
                        onChange(serializeGradient(gradAngle, parsed.hex, gradTo));
                    } else {
                        setGradTo(parsed.hex);
                        onChange(serializeGradient(gradAngle, gradFrom, parsed.hex));
                    }
                } else {
                    onChange(parsed.hex);
                }
            }
        }
    };

    // 输入框失去焦点或按回车强制规范格式并保存
    const handleHexInputBlur = () => {
        const parsed = parseColor(hexInput);
        setHsv({ h: parsed.h, s: parsed.s, v: parsed.v });
        setAlpha(parsed.a);
        setHexInput(parsed.hex);

        if (activeTab === 'gradient') {
            if (activeGradStop === 'from') {
                setGradFrom(parsed.hex);
                const finalGrad = serializeGradient(gradAngle, parsed.hex, gradTo);
                onChange(finalGrad);
                saveToRecentColors(finalGrad);
            } else {
                setGradTo(parsed.hex);
                const finalGrad = serializeGradient(gradAngle, gradFrom, parsed.hex);
                onChange(finalGrad);
                saveToRecentColors(finalGrad);
            }
        } else {
            onChange(parsed.hex);
            saveToRecentColors(parsed.hex);
        }
        if (onInteractiveEnd) onInteractiveEnd();
    };

    const handleHexInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    // 调用原生吸管 EyeDropper
    const handlePickColor = async () => {
        if (typeof window !== 'undefined' && 'EyeDropper' in window) {
            try {
                const eyeDropper = new (window as any).EyeDropper();
                const result = await eyeDropper.open();
                const parsed = parseColor(result.sRGBHex);
                setHsv({ h: parsed.h, s: parsed.s, v: parsed.v });
                setAlpha(parsed.a);
                setHexInput(parsed.hex);

                if (activeTab === 'gradient') {
                    if (activeGradStop === 'from') {
                        setGradFrom(parsed.hex);
                        const finalGrad = serializeGradient(gradAngle, parsed.hex, gradTo);
                        onChange(finalGrad);
                        saveToRecentColors(finalGrad);
                    } else {
                        setGradTo(parsed.hex);
                        const finalGrad = serializeGradient(gradAngle, gradFrom, parsed.hex);
                        onChange(finalGrad);
                        saveToRecentColors(finalGrad);
                    }
                } else {
                    onChange(parsed.hex);
                    saveToRecentColors(parsed.hex);
                }
                if (onInteractiveEnd) onInteractiveEnd();
            } catch (err) {
                console.log('EyeDropper cancelled or failed', err);
            }
        }
    };

    const hueColor = `hsl(${hsv.h}, 100%, 50%)`;
    const rgbSolid = hsvToRgb(hsv.h, hsv.s, hsv.v);

    return (
        <div className="flex flex-col gap-3 w-[216px] text-slate-700 bg-white">
            {/* 顶层 纯色 / 渐变 Tabs 切换 */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('solid');
                        onChange(gradFrom);
                    }}
                    className={`flex-1 text-center py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        activeTab === 'solid' ? 'bg-white shadow-sm text-indigo-650' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    纯色
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab('gradient');
                        onChange(serializeGradient(gradAngle, gradFrom, gradTo));
                    }}
                    className={`flex-1 text-center py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        activeTab === 'gradient' ? 'bg-white shadow-sm text-indigo-650' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    渐变
                </button>
            </div>

            {/* 渐变端点与角度专属控制器 */}
            {activeTab === 'gradient' && (
                <div className="flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-150">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">颜色点</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveGradStop('from')}
                                className={`w-5.5 h-5.5 rounded-full border-2 cursor-pointer transition-transform ${
                                    activeGradStop === 'from' ? 'border-indigo-500 scale-110 shadow-sm' : 'border-slate-200 hover:scale-105'
                                }`}
                                style={{ backgroundColor: gradFrom }}
                                title="起点颜色"
                            />
                            <button
                                type="button"
                                onClick={() => setActiveGradStop('to')}
                                className={`w-5.5 h-5.5 rounded-full border-2 cursor-pointer transition-transform ${
                                    activeGradStop === 'to' ? 'border-indigo-500 scale-110 shadow-sm' : 'border-slate-200 hover:scale-105'
                                }`}
                                style={{ backgroundColor: gradTo }}
                                title="终点颜色"
                            />
                        </div>
                        <span className="ml-auto text-[9px] font-bold text-slate-400 font-mono">
                            {activeGradStop === 'from' ? '起点' : '终点'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                            <span>渐变角度</span>
                            <span className="font-mono">{gradAngle}°</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="360"
                            value={gradAngle}
                            onChange={(e) => {
                                const angle = parseInt(e.target.value);
                                setGradAngle(angle);
                                onChange(serializeGradient(angle, gradFrom, gradTo));
                            }}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-ew-resize accent-indigo-550"
                        />
                    </div>
                </div>
            )}

            {/* 二维 HSV 画板 */}
            <div
                ref={hsvPadRef}
                onPointerDown={handleHsvPointerDown}
                className="w-full h-[120px] rounded-xl relative overflow-hidden cursor-crosshair select-none touch-none border border-slate-100"
                style={{ backgroundColor: hueColor }}
            >
                {/* 水平白到透明渐变 */}
                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                {/* 垂直透明到黑渐变 */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
                
                {/* 指针 */}
                <div
                    className="absolute w-3.5 h-3.5 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_1px_4px_rgba(0,0,0,0.35)] pointer-events-none"
                    style={{
                        left: `${hsv.s}%`,
                        top: `${100 - hsv.v}%`
                    }}
                />
            </div>

            {/* 色相 Hue 滑块 */}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>色相 (Hue)</span>
                    <span className="font-mono">{hsv.h}°</span>
                </div>
                <div
                    ref={hueSliderRef}
                    onPointerDown={handleHuePointerDown}
                    className="h-2 rounded-full relative cursor-ew-resize select-none touch-none"
                    style={{
                        background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                    }}
                >
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-slate-200 rounded-full -translate-x-1/2 shadow-[0_1px_3px_rgba(0,0,0,0.2)] pointer-events-none"
                        style={{ left: `${(hsv.h / 360) * 100}%` }}
                    />
                </div>
            </div>

            {/* Alpha 滑块 (仅在 showAlpha 为真时展示) */}
            {showAlpha && (
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        <span>透明度 (Opacity)</span>
                        <span className="font-mono">{Math.round(alpha * 100)}%</span>
                    </div>
                    <div
                        ref={alphaSliderRef}
                        onPointerDown={handleAlphaPointerDown}
                        className="h-2 rounded-full relative cursor-ew-resize select-none touch-none overflow-hidden"
                        style={{
                            backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><rect width="4" height="4" fill="%23e2e8f0"/><rect x="4" y="4" width="4" height="4" fill="%23e2e8f0"/></svg>\')'
                        }}
                    >
                        <div
                            className="absolute inset-0"
                            style={{
                                background: `linear-gradient(to right, rgba(${rgbSolid.r}, ${rgbSolid.g}, ${rgbSolid.b}, 0), rgba(${rgbSolid.r}, ${rgbSolid.g}, ${rgbSolid.b}, 1))`
                            }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border border-slate-200 rounded-full -translate-x-1/2 shadow-[0_1px_3px_rgba(0,0,0,0.2)] pointer-events-none"
                            style={{ left: `${alpha * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* HEX 输入框与原生吸管 */}
            <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus-within:border-indigo-400 focus-within:bg-white transition-all">
                    <span className="text-[10px] text-slate-400 font-bold font-mono mr-1">#</span>
                    <input
                        type="text"
                        value={hexInput.replace(/^#/, '')}
                        onChange={handleHexInputChange}
                        onBlur={handleHexInputBlur}
                        onKeyDown={handleHexInputKeyDown}
                        className="w-full bg-transparent border-none text-[11px] font-mono font-bold text-slate-700 outline-none p-0"
                        placeholder="FFFFFF"
                    />
                </div>

                {typeof window !== 'undefined' && 'EyeDropper' in window && (
                    <button
                        type="button"
                        onClick={handlePickColor}
                        className="p-2 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl flex items-center justify-center shrink-0 cursor-pointer bg-white transition-colors"
                        title="吸管工具 (吸取屏幕颜色)"
                    >
                        <Pipette size={13} />
                    </button>
                )}
            </div>

            {/* 最近使用颜色 */}
            {recentColors.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">最近颜色</div>
                    <div className="flex flex-wrap gap-1.5 max-h-[50px] overflow-y-auto pr-0.5">
                        {recentColors.map((rc, idx) => (
                            <button
                                key={`${rc}-${idx}`}
                                type="button"
                                onClick={() => applyColor(rc)}
                                className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-sm"
                                style={{ background: rc }}
                                title={rc}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 推荐配色 / 推荐渐变色 */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                {activeTab === 'solid' ? (
                    <>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">推荐底色</div>
                        <div className="flex gap-1.5">
                            {PRESET_BACKGROUNDS.map(bg => (
                                <button
                                    key={bg.color}
                                    type="button"
                                    onClick={() => applyColor(bg.color)}
                                    className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-sm"
                                    style={{ backgroundColor: bg.color }}
                                    title={bg.name}
                                />
                            ))}
                        </div>

                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-2 block">推荐色彩</div>
                        <div className="grid grid-cols-5 gap-1.5">
                            {PRESET_COLORS.map(pc => (
                                <button
                                    key={pc}
                                    type="button"
                                    onClick={() => applyColor(pc)}
                                    className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-sm"
                                    style={{ backgroundColor: pc }}
                                    title={pc}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">推荐渐变色</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {PRESET_GRADIENTS.map(pg => (
                                <button
                                    key={pg.value}
                                    type="button"
                                    onClick={() => applyColor(pg.value)}
                                    className="h-6 rounded-lg border border-slate-200 cursor-pointer transition-all hover:scale-103 active:scale-97 shadow-sm text-[9px] text-white font-bold flex items-center justify-center text-shadow-sm px-1 truncate"
                                    style={{ background: pg.value }}
                                    title={pg.name}
                                >
                                    {pg.name}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// #region ColorPicker Props接口
interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    showAlpha?: boolean;
    disabled?: boolean;
    triggerClassName?: string;
    onInteractiveStart?: () => void;
    onInteractiveEnd?: () => void;
    children?: React.ReactNode;
}
// #endregion

/**
 * @description 带 Popover 弹框的颜色调节组件
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
    color,
    onChange,
    showAlpha = false,
    disabled = false,
    triggerClassName = '',
    onInteractiveStart,
    onInteractiveEnd,
    children
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 点击外部区域关闭 Popover
    useEffect(() => {
        const handleOutsideClick = (e: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('pointerdown', handleOutsideClick);
        }
        return () => {
            document.removeEventListener('pointerdown', handleOutsideClick);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-7 h-7 rounded-lg border border-slate-250 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${triggerClassName}`}
                style={children ? undefined : {
                    background: color || '#FFFFFF',
                    backgroundImage: !color ? 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><rect width="4" height="4" fill="%23e2e8f0"/><rect x="4" y="4" width="4" height="4" fill="%23e2e8f0"/></svg>\')' : undefined
                }}
                title="选择颜色"
            >
                {children}
            </button>

            {/* Popover 弹框面板 */}
            {isOpen && (
                <div
                    className="absolute z-50 mt-2 bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-2 duration-150 origin-top-left"
                    style={{
                        top: '100%',
                        left: 0
                    }}
                >
                    <ColorPickerPanel
                        color={color}
                        onChange={onChange}
                        showAlpha={showAlpha}
                        onInteractiveStart={onInteractiveStart}
                        onInteractiveEnd={onInteractiveEnd}
                    />
                </div>
            )}
        </div>
    );
};
