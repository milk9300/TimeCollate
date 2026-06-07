import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// #region Shader Source Code
const vertexShader = `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        vec3 pos = position;
        
        // 简谐运动三维波形计算 - 提升幅度和频率以增加动态可感性
        float waveX = 0.08 * sin(2.5 * pos.x + 1.8 * uTime);
        float waveY = 0.05 * cos(2.0 * pos.y + 1.4 * uTime);
        pos.z += waveX + waveY;
        
        // 解析法线计算 (微积分求导求切线，叉乘得出法线)
        float dzdx = 0.20 * cos(2.5 * position.x + 1.8 * uTime);
        float dzdy = -0.10 * sin(2.0 * position.y + 1.4 * uTime);
        
        vec3 localNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
        
        vNormal = normalMatrix * localNormal;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    uniform vec3 uBaseColor;
    uniform vec3 uLightPos;
    uniform vec3 uLightColor;
    uniform float uOpacity;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    
    void main() {
        vec3 normal = normalize(vNormal);
        
        // 计算受光向量
        vec3 lightDir = normalize(uLightPos - vViewPosition);
        
        // 简易环境光与漫反射计算
        vec3 ambient = vec3(0.5, 0.52, 0.65);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * uLightColor;
        
        vec3 finalColor = uBaseColor * (ambient + diffuse);
        
        // 边缘渐变淡出，呈现极薄半透明的纸张边缘感
        float edgeAlpha = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x) *
                          smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
        
        gl_FragColor = vec4(finalColor, uOpacity * edgeAlpha);
    }
`;
// #endregion

import logoImg from '../../../assets/logo.png';

interface AuthLayoutProps {
    children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const materialsRef = useRef<THREE.ShaderMaterial[]>([]);
    
    const [isReady, setIsReady] = useState(false);
    const hasRendered = useRef(false);
    const mouse = useRef({ x: 0, y: 0 });
    const lightPos = useRef(new THREE.Vector3(0, 0, 4));

    // ======== 智能强缩放检测 ========
    const formWrapperRef = useRef<HTMLDivElement>(null);
    const [formScale, setFormScale] = useState(1);

    useEffect(() => {
        const calculateScale = () => {
            if (!formWrapperRef.current) return;
            const vh = window.innerHeight;
            // 消除当前 transform 影响，获取真实高度
            const intrinsicHeight = formWrapperRef.current.scrollHeight;
            const padding = 60; // 上下预留的安全边距

            if (intrinsicHeight > 0 && intrinsicHeight + padding > vh) {
                // 如果原始高度超出了屏幕，强行计算出安全缩放比例
                setFormScale((vh - padding) / intrinsicHeight);
            } else {
                setFormScale(1);
            }
        };

        const timer = setTimeout(calculateScale, 50);
        window.addEventListener('resize', calculateScale);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateScale);
        };
    }, [children]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        // 1. 初始化 Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // 2. 初始化 Camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
        camera.position.z = 6;
        cameraRef.current = camera;

        // 3. 初始化 WebGLRenderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 4. 创建浮动书页模型 (7个)
        const pagesCount = 7;
        const meshes: THREE.Mesh[] = [];
        
        // 纸张颜色调色板 (柔和蓝紫靛青与暖白)
        const colors = [
            new THREE.Color('#e0e7ff'), // Indigo 100
            new THREE.Color('#f3e8ff'), // Purple 100
            new THREE.Color('#fafaf9'), // Stone 50
            new THREE.Color('#e0f2fe'), // Sky 100
            new THREE.Color('#c7d2fe')  // Indigo 200
        ];

        const materials: THREE.ShaderMaterial[] = [];
        materialsRef.current = materials;

        for (let i = 0; i < pagesCount; i++) {
            // 书页大小比例 (1.2 x 1.6)
            const geometry = new THREE.PlaneGeometry(1.2, 1.6, 24, 24);
            
            const color = colors[i % colors.length];
            const opacity = 0.55 + Math.random() * 0.25;

            const material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                uniforms: {
                    uTime: { value: 0 },
                    uBaseColor: { value: color },
                    uLightPos: { value: lightPos.current },
                    uLightColor: { value: new THREE.Color('#a78bfa') }, // 品牌亮紫色高光
                    uOpacity: { value: opacity }
                }
            });
            materials.push(material);

            const mesh = new THREE.Mesh(geometry, material);
            
            // 空间随机排布
            mesh.position.set(
                (Math.random() - 0.5) * 6.5,
                (Math.random() - 0.5) * 5.0,
                -Math.random() * 3.0 // 位于背景深处
            );
            
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.5
            );

            // 自定义动力学参数 - 调高旋转与漂移速度，增强动态生命感
            mesh.userData = {
                initialX: mesh.position.x,
                initialY: mesh.position.y,
                spinSpeed: 0.003 + Math.random() * 0.003,
                phase: Math.random() * Math.PI * 2,
                speedY: 0.6 + Math.random() * 0.5,
                speedX: 0.3 + Math.random() * 0.3
            };

            scene.add(mesh);
            meshes.push(mesh);
        }

        // 5. 动画循环与时间线
        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            const time = clock.getElapsedTime();

            // 平滑插值 (lerp) 鼠标控制的光源偏移
            const targetX = mouse.current.x * 6;
            const targetY = mouse.current.y * 5;
            const targetZ = 3.5;
            
            lightPos.current.x += (targetX - lightPos.current.x) * 0.06;
            lightPos.current.y += (targetY - lightPos.current.y) * 0.06;
            lightPos.current.z += (targetZ - lightPos.current.z) * 0.06;

            // 更新所有网格的位置与着色器参数
            meshes.forEach((mesh) => {
                const ud = mesh.userData;
                
                // 缓缓旋转
                mesh.rotation.y += ud.spinSpeed;
                mesh.rotation.x += ud.spinSpeed * 0.5;
                
                // 简谐漂浮运动 - 加大振幅 (y 0.25 -> 0.45, x 0.12 -> 0.25)
                mesh.position.y = ud.initialY + Math.sin(time * ud.speedY + ud.phase) * 0.45;
                mesh.position.x = ud.initialX + Math.cos(time * ud.speedX + ud.phase) * 0.25;
            });

            // 更新 Shader 变量
            materials.forEach((mat) => {
                mat.uniforms.uTime.value = time;
                mat.uniforms.uLightPos.value.copy(lightPos.current);
            });

            renderer.render(scene, camera);

            // 第一帧渲染完毕后延迟显示，消除首屏白屏和卡顿感
            if (!hasRendered.current) {
                hasRendered.current = true;
                setTimeout(() => {
                    setIsReady(true);
                }, 150);
            }
        };

        animate();

        // 6. 全局事件监听
        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };

        const handleResize = () => {
            if (!container || !renderer || !camera) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        // 7. 组件卸载销毁清理 (遵循 Production-Ready 标准，防止 WebGL 内存与上下文泄漏)
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            
            if (rendererRef.current && rendererRef.current.domElement && container) {
                if (container.contains(rendererRef.current.domElement)) {
                    container.removeChild(rendererRef.current.domElement);
                }
            }
            
            meshes.forEach((mesh) => {
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((mat) => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            });
            
            materialsRef.current.forEach((mat) => mat.dispose());
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current.forceContextLoss(); // 彻底强制释放 WebGL 渲染上下文
            }
        };
    }, []);

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#F8F9FD] font-['Outfit',_sans-serif]">
            {/* 首屏渐变加载占位图 */}
            <div 
                className={`absolute inset-0 bg-gradient-to-tr from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] transition-opacity duration-1000 ease-out z-30 ${
                    isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`} 
            />

            {/* 图层一：3D 动态层 (Three.js WebGL Canvas) */}
            <div ref={containerRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none" />

            {/* 图层二：遮罩调色层 */}
            <div className="fixed inset-0 bg-gradient-to-br from-[#4f46e5]/10 via-transparent to-[#7c3aed]/10 mix-blend-overlay pointer-events-none z-10" />

            {/* 图层三：DOM 交互层 (左右分栏布局) */}
            <div className="relative z-20 w-full min-h-screen flex flex-col lg:flex-row justify-between px-6 md:px-16 lg:px-32 max-w-[1600px] mx-auto overflow-hidden">
                
                {/* 左侧：品牌文案与 3D 视觉展示区 */}
                <div className="hidden lg:block flex-1 text-left pr-12 pointer-events-none my-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <img src={logoImg} alt="Logo" className="w-20 h-20 object-contain drop-shadow-lg" />
                        <span className="text-4xl font-black text-gray-900 tracking-tight">拾光集</span>
                    </div>
                    <h1 className="text-5xl xl:text-6xl font-black text-gray-900 mb-6 drop-shadow-md tracking-tight leading-tight">
                        记录时光，<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                            珍藏每一份感动。
                        </span>
                    </h1>
                    <p className="text-xl text-gray-600 font-medium max-w-lg leading-relaxed drop-shadow-sm">
                        时光笔记为您提供无边框的数字记忆档案馆。通过前沿 3D 视觉，让您的每一份珍贵记忆都能在时空中鲜活流转。
                    </p>
                </div>

                {/* 右侧：通行证表单区域 (通过 React Hook 绝对自适应缩放) */}
                <div className="w-full max-w-[400px] shrink-0 mx-auto lg:mx-0 flex items-center justify-center min-h-screen">
                    <div 
                        ref={formWrapperRef}
                        className="w-full transition-transform duration-300 ease-out origin-center"
                        style={{ transform: `scale(${formScale})` }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
