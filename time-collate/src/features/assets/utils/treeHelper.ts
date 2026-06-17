import type { MaterialFolder } from '../services/assetService';

export interface FolderNode extends MaterialFolder {
    children: FolderNode[];
}

/**
 * 将扁平的文件夹列表构建为层次化的嵌套树形结构
 * 保持 system（官方）和 user 目录分类，按 sort_order 升序排序
 */
export function buildFolderTree(folders: MaterialFolder[]): FolderNode[] {
    const nodeMap: Record<string, FolderNode> = {};
    const roots: FolderNode[] = [];

    // 1. 初始化节点映射表
    folders.forEach(folder => {
        nodeMap[folder.id] = { ...folder, children: [] };
    });

    // 2. 双指针关联父子级
    folders.forEach(folder => {
        const node = nodeMap[folder.id];
        if (folder.parent_id && nodeMap[folder.parent_id]) {
            nodeMap[folder.parent_id].children.push(node);
        } else {
            roots.push(node);
        }
    });

    // 3. 递归排序子集
    const sortTreeNodes = (nodes: FolderNode[]) => {
        nodes.sort((a, b) => {
            if (a.sort_order !== b.sort_order) {
                return a.sort_order - b.sort_order;
            }
            return a.name.localeCompare(b.name, 'zh');
        });
        nodes.forEach(n => {
            if (n.children.length > 0) {
                sortTreeNodes(n.children);
            }
        });
    };

    sortTreeNodes(roots);
    return roots;
}
