import { pool } from '../db/index.js';

export class TrafficService {
    /**
     * 记录流量
     * @param type 流量类型：upload (上传) 或 export (导出)
     * @param bytes 字节数
     */
    async recordTraffic(type: 'upload' | 'export', bytes: number) {
        try {
            if (bytes <= 0) return;
            const today = new Date().toISOString().slice(0, 10);
            const column = type === 'upload' ? 'upload_bytes' : 'export_bytes';
            await pool.query(
                `INSERT INTO daily_traffic_stats (date, ${column}) 
                 VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE ${column} = ${column} + ?`,
                [today, bytes, bytes]
            );
        } catch (error) {
            console.error('[TrafficService] Failed to record traffic:', error);
        }
    }

    /**
     * 获取最近 days 天的流量统计
     * @param days 统计天数
     */
    async getTrafficStats(days: number = 7) {
        try {
            const [rows]: any = await pool.query(
                `SELECT date, upload_bytes as uploadBytes, export_bytes as exportBytes 
                 FROM daily_traffic_stats 
                 ORDER BY date DESC 
                 LIMIT ?`,
                [days]
            );
            return rows.reverse(); // 按日期从早到晚排序
        } catch (error) {
            console.error('[TrafficService] Failed to get traffic stats:', error);
            return [];
        }
    }
}

export const trafficService = new TrafficService();
