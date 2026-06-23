//#region Image Dimensions Helper
/**
 * 读取图片 URL 路径，解析其原始宽高和纵横比 (aspectRatio)
 * @param url 图片资源路径 (Blob, ObjectURL 或 HTTP 链接)
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width || 1;
      const height = img.naturalHeight || img.height || 1;
      const aspectRatio = width / height;
      resolve({ width, height, aspectRatio });
    };
    img.onerror = (err) => {
      reject(new Error('Failed to load image for dimension analysis: ' + err));
    };
    img.src = url;
  });
}

/**
 * 根据默认宽度 (如 300px) 以及原图比例，计算出不失真的绝对高度，并组装 Element 对象
 * @param url 图片路径
 * @param x 初始投放的 x 坐标
 * @param y 初始投放的 y 坐标
 * @param defaultWidth 默认宽度，默认为 300px
 */
export async function createImageElementSchema(
  url: string, 
  x: number = 50, 
  y: number = 50, 
  defaultWidth: number = 300
) {
  try {
    const { aspectRatio } = await getImageDimensions(url);
    const calculatedHeight = Math.round(defaultWidth / aspectRatio);
    
    return {
      id: crypto.randomUUID(),
      type: 'image' as const,
      x,
      y,
      width: defaultWidth,
      height: calculatedHeight,
      zIndex: 1,
      aspectRatio,
      src: url,
    };
  } catch (err) {
    console.error('Image loading failed, fallback to 1:1 ratio.', err);
    // 回退防御机制：返回 1:1 比例默认尺寸
    return {
      id: crypto.randomUUID(),
      type: 'image' as const,
      x,
      y,
      width: defaultWidth,
      height: defaultWidth,
      zIndex: 1,
      aspectRatio: 1,
      src: url,
    };
  }
}
//#endregion
