// #region Description
/**
 * @description 统一字体资产处理流水线 (Font Asset Pipeline)
 * 执行 NPF/npx 命令自动下载清单中的 Google Fonts，解压，执行中文字体 Unicode-Range 高效切片，
 * 上传至私有对象存储 (R2/OSS)，最后写入/更新 MySQL 资产数据库。
 */
// #endregion

import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import OSS from 'ali-oss';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路径定义
const SERVER_ROOT = path.join(__dirname, '../../..');
const PIPELINE_DIR = path.join(SERVER_ROOT, 'src/scripts/font-pipeline');
const MANIFEST_PATH = path.join(PIPELINE_DIR, 'fonts-manifest.json');
const RAW_FONTS_DIR = path.join(SERVER_ROOT, 'raw-fonts');
const DOWNLOADS_DIR = path.join(RAW_FONTS_DIR, 'downloads');
const DIST_FONTS_DIR = path.join(SERVER_ROOT, 'dist-fonts');

interface FontManifestItem {
    id: string;
    name: string;
    displayName: string;
    source: 'google' | 'local';
    localFile?: string;
    category: 'sans-serif' | 'serif' | 'handwriting' | 'display' | 'cjk-font';
    language: string[];
    license: string;
    author: string;
    previewText: string;
    tags: string[];
}

// 获取文件 MIME 类型
function getMimeType(ext: string): string {
    switch (ext) {
        case '.woff2': return 'font/woff2';
        case '.css': return 'text/css';
        case '.ttf': return 'font/ttf';
        case '.otf': return 'font/otf';
        default: return 'application/octet-stream';
    }
}

// 递归查找 TTF/OTF 文件
async function findFontFile(dir: string): Promise<string | null> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const fontFiles: string[] = [];
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const subResult = await findFontFile(fullPath);
            if (subResult) return subResult;
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.ttf' || ext === '.otf') {
                fontFiles.push(fullPath);
            }
        }
    }

    // 优先选择 Regular 字重
    const regular = fontFiles.find(f => f.toLowerCase().includes('regular'));
    if (regular) return regular;
    
    // 其次选择 Variable 字体
    const variable = fontFiles.find(f => f.toLowerCase().includes('wght'));
    if (variable) return variable;

    return fontFiles.length > 0 ? fontFiles[0] : null;
}

// 下载 Google Fonts 字体包
async function downloadGoogleFont(fontName: string): Promise<string> {
    const downloadUrl = `https://fonts.google.com/download?family=${encodeURIComponent(fontName)}`;
    const zipPath = path.join(DOWNLOADS_DIR, `${fontName.replace(/\s+/g, '_')}.zip`);
    const extractDir = path.join(RAW_FONTS_DIR, fontName.replace(/\s+/g, '-'));

    console.log(`📡 正在从 Google Fonts 下载字体包: ${fontName} ...`);
    console.log(`下载链接: ${downloadUrl}`);

    const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', err => reject(err));
    });

    console.log(`📦 下载成功，正在解压: ${zipPath}`);
    await fs.ensureDir(extractDir);

    // 在 Windows 环境下使用 PowerShell 原生 Expand-Archive 命令解压
    const unzipCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`;
    execSync(unzipCmd, { stdio: 'inherit' });

    // 删除临时 zip 文件
    await fs.remove(zipPath);

    // 寻找解压后的 TTF 物理路径
    const foundTtf = await findFontFile(extractDir);
    if (!foundTtf) {
        throw new Error(`Failed to find TTF/OTF in unzipped Google Font package: ${fontName}`);
    }

    console.log(`🎯 找到字体文件: ${foundTtf}`);
    return foundTtf;
}

// 物理上传单个文件至 OSS/R2
async function uploadToCloud(key: string, filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = getMimeType(ext);
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    const cleanRegion = config.oss.region.startsWith('oss-')
        ? config.oss.region.slice(4)
        : config.oss.region;

    if (config.storageProvider === 'r2') {

        const endpoint = config.oss.customDomain 
            ? config.oss.customDomain 
            : `https://oss-${cleanRegion}.aliyuncs.com`;

        const s3Client = new S3Client({
            region: config.oss.region,
            endpoint: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
            credentials: {
                accessKeyId: config.oss.accessKeyId,
                secretAccessKey: config.oss.secretAccessKey,
            },
        });

        await s3Client.send(new PutObjectCommand({
            Bucket: config.oss.bucket,
            Key: cleanKey,
            Body: fileBuffer,
            ContentType: mime,
            CacheControl: 'max-age=31536000',
        }));
    } else {
        const cleanRegion = config.oss.region.startsWith('oss-')
            ? config.oss.region
            : `oss-${config.oss.region}`;

        const ossClient = new OSS({
            region: cleanRegion,
            accessKeyId: config.oss.accessKeyId,
            accessKeySecret: config.oss.secretAccessKey,
            bucket: config.oss.bucket,
            secure: true,
        });

        await ossClient.put(cleanKey, fileBuffer, {
            headers: {
                'Cache-Control': 'max-age=31536000',
                'Content-Disposition': 'inline',
            },
            mime: mime,
        });
    }

    // 组装最终 CDN/访问域名 URL
    let baseDomain = config.oss.customDomain;
    if (baseDomain) {
        if (!/^https?:\/\//i.test(baseDomain)) {
            baseDomain = `https://${baseDomain}`;
        }
        if (baseDomain.endsWith('/')) {
            baseDomain = baseDomain.slice(0, -1);
        }
        return `${baseDomain}/${cleanKey}`;
    }

    return `https://${config.oss.bucket}.oss-${cleanRegion}.aliyuncs.com/${cleanKey}`;
}

async function setupBucketCORS() {
    if (config.storageProvider === 'r2') {
        return;
    }
    
    try {
        console.log(`📡 正在为 OSS 存储桶 [${config.oss.bucket}] 配置 CORS 跨域规则...`);
        const cleanRegion = config.oss.region.startsWith('oss-')
            ? config.oss.region
            : `oss-${config.oss.region}`;

        const ossClient = new OSS({
            region: cleanRegion,
            accessKeyId: config.oss.accessKeyId,
            accessKeySecret: config.oss.secretAccessKey,
            bucket: config.oss.bucket,
            secure: true,
        });

        const rules = [
            {
                allowedOrigin: '*',
                allowedMethod: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                allowedHeader: '*',
                exposeHeader: ['ETag', 'x-oss-request-id', 'Content-Length'],
                maxAgeSeconds: 3000
            }
        ];
        await ossClient.putBucketCORS(config.oss.bucket, rules as any);
        console.log(`✅ OSS 跨域 CORS 规则自动配置成功！`);
    } catch (err: any) {
        console.warn(`⚠️ 无法自动配置 OSS CORS: ${err.message}。如果跨域报错，请手动到阿里云控制台为存储桶配置跨域（Allowed Origin: *）。`);
    }
}

async function runPipeline() {
    console.log('============================================================');
    console.log('🎬 [TimeCollate Font Asset Pipeline] 启动...');
    console.log('============================================================');

    // 自动配置云存储存储桶的 CORS 跨域规则
    await setupBucketCORS();

    // 确保基础目录存在
    await fs.ensureDir(RAW_FONTS_DIR);
    await fs.ensureDir(DOWNLOADS_DIR);
    await fs.ensureDir(DIST_FONTS_DIR);

    // 读取静态清单 manifest
    let manifest: FontManifestItem[] = [];
    if (await fs.pathExists(MANIFEST_PATH)) {
        try {
            manifest = await fs.readJson(MANIFEST_PATH);
            console.log(`📋 成功读取配置清单，共包含 ${manifest.length} 个配置字体`);
        } catch (e: any) {
            console.warn(`⚠️ 读取或解析字体清单失败: ${e.message}，将仅采用目录自动扫描。`);
        }
    }

    // 扫描 raw-fonts 目录下的物理文件
    const rawFiles = await fs.readdir(RAW_FONTS_DIR);
    const localFontFiles = rawFiles.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.ttf' || ext === '.otf';
    });
    console.log(`📂 扫描 raw-fonts 目录找到 ${localFontFiles.length} 个物理字体文件`);

    // 组装待处理的任务列表
    const tasks: FontManifestItem[] = [];

    // 1. 遍历扫描到的本地物理文件，进行匹配或自动推断
    for (const file of localFontFiles) {
        const fileExt = path.extname(file);
        const fontName = path.basename(file, fileExt);
        const fileBaseSafe = fontName.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');

        // 在清单中寻找匹配的定义
        const matched = manifest.find(m => {
            if (m.localFile === file) return true;
            const mNameSafe = m.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
            return fileBaseSafe.includes(mNameSafe) || mNameSafe.includes(fileBaseSafe);
        });

        // 生成安全的唯一ID（包含中文汉字、英文数字、下划线及中划线，避免中文全被过滤为连字符）
        const safeId = fontName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '')
            .replace(/\s+/g, '-');

        if (matched) {
            console.log(`🔗 本地文件 "${file}" 成功匹配到清单配置 [${matched.displayName}]`);
            tasks.push({
                ...matched,
                id: safeId,      // 仍使用安全的本地物理ID
                source: 'local', // 强制标记为本地源
                localFile: file   // 绑定具体文件名
            });
        } else {
            console.log(`✨ 本地文件 "${file}" 未在清单中找到，将自动推断元数据`);
            // 自动推断品类
            let category: FontManifestItem['category'] = 'sans-serif';
            const nameLower = fontName.toLowerCase();
            if (nameLower.includes('serif') || nameLower.includes('song') || nameLower.includes('宋')) {
                category = 'serif';
            } else if (nameLower.includes('hand') || nameLower.includes('kai') || nameLower.includes('shu') || nameLower.includes('楷') || nameLower.includes('写') || nameLower.includes('行')) {
                category = 'handwriting';
            } else if (nameLower.includes('display') || nameLower.includes('miao') || nameLower.includes('hei') || nameLower.includes('黑')) {
                category = 'sans-serif';
            }

            tasks.push({
                id: safeId,
                name: fontName,
                displayName: fontName,
                source: 'local',
                localFile: file,
                category: category,
                language: ['zh', 'en'],
                license: 'Unknown (Local)',
                author: 'Local',
                previewText: fontName,
                tags: ['本地导入']
            });
        }
    }

    console.log(`📊 最终整合字体流水线处理任务队列，共 ${tasks.length} 项`);

    // 构建公共域名基础
    let baseDomain = config.oss.customDomain;
    if (!baseDomain) {
        const cleanRegion = config.oss.region.startsWith('oss-')
            ? config.oss.region.slice(4)
            : config.oss.region;
        baseDomain = `https://${config.oss.bucket}.oss-${cleanRegion}.aliyuncs.com`;
    } else {
        if (!/^https?:\/\//i.test(baseDomain)) {
            baseDomain = `https://${baseDomain}`;
        }
        if (baseDomain.endsWith('/')) {
            baseDomain = baseDomain.slice(0, -1);
        }
    }

    // 初始化 MySQL 连接 (增加重试与网络诊断提示)
    let connection: mysql.Connection | null = null;
    let dbAttempts = 0;
    const maxDbAttempts = 3;

    while (dbAttempts < maxDbAttempts) {
        try {
            connection = await mysql.createConnection({
                host: config.mysql.host,
                port: config.mysql.port,
                user: config.mysql.user,
                password: config.mysql.password,
                database: config.mysql.database,
                ssl: config.mysql.ssl
            });
            break;
        } catch (err: any) {
            dbAttempts++;
            console.warn(`⚠️ 数据库连接失败 (第 ${dbAttempts}/${maxDbAttempts} 次尝试): ${err.message}`);
            if (dbAttempts >= maxDbAttempts) {
                console.error(`\n❌ 无法建立数据库连接。`);
                console.error(`💡 诊断建议:`);
                console.error(`1. 您的数据库 host 为新加坡 AWS TiDB Cloud (${config.mysql.host}:${config.mysql.port})，从国内直接访问可能面临高丢包率或超时。`);
                console.error(`2. 请检查您的代理软件（如 Clash / v2ray / VPN）是否开启，或者代理规则是否阻断了去往 port 4000 的普通 TCP 流量。如果开启了 TUN 虚拟网卡模式，请尝试切换为规则代理或直连重试。`);
                process.exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    try {
        for (const item of tasks) {
            console.log(`\n------------------------------------------------------------`);
            console.log(`👉 正在处理 [${item.displayName}] (${item.name})`);
            console.log(`------------------------------------------------------------`);

            let fontFilePath = '';

            // Step 1: 准备物理字体文件
            if (item.source === 'google') {
                try {
                    fontFilePath = await downloadGoogleFont(item.name);
                } catch (e: any) {
                    console.error(`❌ 下载 Google Font "${item.name}" 失败:`, e.message);
                    continue; // 下载失败则跳过当前字体，不影响其余字体
                }
            } else if (item.source === 'local') {
                if (!item.localFile) {
                    console.error(`❌ 错误：本地字体没有指定 localFile 路径`);
                    continue;
                }
                fontFilePath = path.join(RAW_FONTS_DIR, item.localFile);
                if (!await fs.pathExists(fontFilePath)) {
                    console.error(`❌ 错误：本地字体文件未找到: ${fontFilePath}`);
                    continue;
                }
                console.log(`🎯 找到本地字体文件: ${fontFilePath}`);
            }

            // Step 2: 运行 cn-font-split 执行 Unicode-Range 静态切片
            const safeFontName = item.id.replace(/\s+/g, '-');
            const tempOutDir = path.join(DIST_FONTS_DIR, safeFontName);
            await fs.emptyDir(tempOutDir);

            console.log(`⚙️ 正在执行 Wasm 切片中 (时间取决于字体体积)...`);
            
            const splitCmd = `npx cn-font-split -i "${fontFilePath}" -o "${tempOutDir}"`;
            try {
                execSync(splitCmd, { stdio: 'inherit', cwd: SERVER_ROOT });
            } catch (err: any) {
                console.error(`❌ 字体 "${item.name}" 切片失败:`, err.message);
                continue;
            }

            // Step 3: 上传切片集至云存储 (R2/OSS)
            const generatedFiles = await fs.readdir(tempOutDir);
            console.log(`📤 切片成功，共 ${generatedFiles.length} 个文件。正在上传至云存储...`);
            
            // 并发上传控制，限制最大并发数为 10，并加入 3 次容错重试机制
            const concurrencyLimit = 10;
            let fileIndex = 0;
            let uploadedCssUrl = '';

            const uploadWorker = async () => {
                while (fileIndex < generatedFiles.length) {
                    const currentIdx = fileIndex++;
                    if (currentIdx >= generatedFiles.length) break;

                    const file = generatedFiles[currentIdx];
                    const localPath = path.join(tempOutDir, file);
                    const ossKey = `fonts/${safeFontName}/${file}`;

                    let attempts = 0;
                    const maxAttempts = 3;
                    let cloudUrl = '';

                    while (attempts < maxAttempts) {
                        try {
                            cloudUrl = await uploadToCloud(ossKey, localPath);
                            break; // 成功则跳出重试
                        } catch (err: any) {
                            attempts++;
                            console.warn(`⚠️ 上传 [${file}] 失败 (第 ${attempts}/${maxAttempts} 次重试): ${err.message}`);
                            if (attempts >= maxAttempts) {
                                throw new Error(`Failed to upload ${file} after ${maxAttempts} attempts: ${err.message}`);
                            }
                            // 指数级退避延时 (1s, 2s)
                            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                        }
                    }

                    if (file === 'result.css') {
                        uploadedCssUrl = cloudUrl;
                    }
                }
            };

            // 启动并发 Worker 队列
            const workers = Array(Math.min(concurrencyLimit, generatedFiles.length))
                .fill(null)
                .map(() => uploadWorker());

            await Promise.all(workers);
            console.log(`✅ 所有分片上传完成！入口样式链接: ${uploadedCssUrl}`);

            // Step 4: 写入/同步至数据库 assets 表
            const cssContent = await fs.readFile(path.join(tempOutDir, 'result.css'), 'utf8');
            const familyMatch = cssContent.match(/font-family:\s*['"]([^'"]+)['"]/);
            const cssFamily = familyMatch ? familyMatch[1] : item.name;

            const assetId = `font-${item.id}`;
            const metadata = JSON.stringify({
                css_family: `"${cssFamily}", sans-serif`,
                display_name: item.displayName,
                category: item.category,
                language: item.language,
                license: item.license,
                author: item.author,
                preview_text: item.previewText,
                tags: item.tags,
                total_slices: generatedFiles.length - 1
            });

            console.log(`💾 写入数据库 system_materials 表记录...`);
            await connection!.query(
                `INSERT INTO system_materials (id, type, name, url, oss_key, metadata, created_at)
                 VALUES (?, 'font', ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE url = VALUES(url), metadata = VALUES(metadata)`,
                [assetId, item.name, uploadedCssUrl, `fonts/${safeFontName}/result.css`, metadata, Date.now()]
            );
            console.log(`🎉 字体 [${item.displayName}] 同步数据库成功！`);

            // Step 5: 清理本地生成的临时切片
            await fs.remove(tempOutDir);
            console.log(`🧹 已清理临时目录: ${tempOutDir}`);

            // 如果是 Google Fonts，同时清理临时下载的未切片字体目录，保持 raw-fonts 目录整洁
            if (item.source === 'google') {
                const rawFontDir = path.join(RAW_FONTS_DIR, item.name.replace(/\s+/g, '-'));
                await fs.remove(rawFontDir);
            }
        }
    } catch (e: any) {
        console.error('❌ 流水线运行中发生未知严重错误:', e);
    } finally {
        if (connection) {
            await connection.end();
        }
        console.log('\n============================================================');
        console.log('🏁 [TimeCollate Font Asset Pipeline] 运行结束，数据库连接已关闭。');
        console.log('============================================================');
    }
}

runPipeline();
