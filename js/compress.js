// 文件压缩功能模块
class Compressor {
    constructor() {
        this.isCompressing = false;
        this.compressionResult = null;
        console.log('🗜️ Compressor initialized');
    }
    
    async compress(files, callback) {
        if (this.isCompressing) {
            callback(false, new Error('正在压缩中，请稍候'));
            return;
        }
        
        this.isCompressing = true;
        const startTime = Date.now();
        
        try {
            // 检查JSZip库是否加载
            if (!window.JSZip) {
                throw new Error('压缩库未加载，请刷新页面重试');
            }
            
            console.log('🚀 Starting compression of', files.length, 'files');
            
            // 创建ZIP实例
            const zip = new JSZip();
            
            // 计算原始总大小
            const originalSize = files.reduce((sum, file) => sum + file.size, 0);
            
            // 更新状态显示
            this.updateStatus('正在准备文件...');
            
            // 添加文件到ZIP（简化版本，按用户要求不需要复杂进度）
            let addedCount = 0;
            for (const file of files) {
                // 处理文件名冲突
                let fileName = file.name;
                let counter = 1;
                while (zip.file(fileName)) {
                    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
                    const ext = file.name.substring(file.name.lastIndexOf('.'));
                    fileName = `${nameWithoutExt}_${counter}${ext}`;
                    counter++;
                }
                
                zip.file(fileName, file);
                addedCount++;
                
                // 简单进度更新
                const progress = Math.round((addedCount / files.length) * 50); // 前50%用于添加文件
                this.updateStatus(`正在添加文件... (${addedCount}/${files.length})`);
                
                // 给UI一些时间更新
                await this.sleep(10);
            }
            
            this.updateStatus('正在生成压缩包...');
            
            // 生成压缩包（简化配置）
            const blob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 6 // 平衡压缩率和速度
                }
            }, (metadata) => {
                // 简单进度显示
                const progress = 50 + Math.round(metadata.percent * 0.5); // 后50%用于压缩
                this.updateStatus(`正在压缩... ${Math.round(metadata.percent)}%`);
            });
            
            const compressedSize = blob.size;
            const duration = Date.now() - startTime;
            
            // 保存压缩结果
            this.compressionResult = {
                blob: blob,
                originalSize: originalSize,
                compressedSize: compressedSize,
                fileCount: files.length,
                duration: duration,
                compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(2)
            };
            
            // 存储结果到全局和sessionStorage
            this.saveResult();
            
            // 创建订单
            await this.createOrder();
            
            console.log('✅ Compression completed:', this.compressionResult);
            
            this.isCompressing = false;
            callback(true);
            
        } catch (error) {
            console.error('❌ Compression error:', error);
            this.isCompressing = false;
            callback(false, error);
        }
    }
    
    updateStatus(message) {
        const statusEl = document.getElementById('compressStatus');
        const progressTextEl = document.getElementById('progressText');
        
        if (statusEl) statusEl.textContent = message;
        if (progressTextEl) progressTextEl.textContent = message;
        
        console.log('📊', message);
    }
    
    saveResult() {
        if (!this.compressionResult) return;
        
        const result = {
            originalSize: this.compressionResult.originalSize,
            compressedSize: this.compressionResult.compressedSize,
            fileCount: this.compressionResult.fileCount,
            fileName: `compressed_files_${Date.now()}`,
            timestamp: Date.now(),
            compressionRatio: this.compressionResult.compressionRatio,
            duration: this.compressionResult.duration
        };
        
        // 存储到sessionStorage（基本信息）
        sessionStorage.setItem('compressResult', JSON.stringify(result));
        
        // 存储到全局变量（包含blob）
        window.compressedBlob = this.compressionResult.blob;
        window.compressResult = result;
        
        console.log('💾 Compression result saved');
    }
    
    async createOrder() {
        try {
            if (!this.compressionResult) return;
            
            const orderData = {
                file_count: this.compressionResult.fileCount,
                original_size: this.compressionResult.originalSize,
                compressed_size: this.compressionResult.compressedSize,
                compression_ratio: this.compressionResult.compressionRatio,
                timestamp: Date.now(),
                user_agent: navigator.userAgent,
                source: 'h5_compressor'
            };
            
            // 发送订单创建请求（按用户要求不处理失败）
            const response = await fetch('http://p.xiexinbao.com/zww_order/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
                mode: 'cors' // 尝试CORS
            });
            
            if (response.ok) {
                const result = await response.json();
                const orderId = result.orderId || result.id || Date.now();
                sessionStorage.setItem('orderId', orderId);
                console.log('📝 Order created successfully:', orderId);
                
                // 订单创建成功打点
                window.analytics.track('order_created', {
                    order_id: orderId,
                    file_count: this.compressionResult.fileCount,
                    original_size: this.compressionResult.originalSize,
                    compressed_size: this.compressionResult.compressedSize
                });
            } else {
                console.log('⚠️ Order creation failed:', response.status);
            }
        } catch (error) {
            console.log('⚠️ Order creation error:', error.message);
            // 按用户要求不处理失败，只记录日志
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 获取压缩结果
    getResult() {
        return this.compressionResult;
    }
    
    // 检查是否正在压缩
    isActive() {
        return this.isCompressing;
    }
    
    // 重置状态
    reset() {
        this.isCompressing = false;
        this.compressionResult = null;
    }
}

// 全局压缩器实例
window.Compressor = new Compressor();

// 导出给其他脚本使用
window.compressor = window.Compressor;

console.log('🗜️ Compress module loaded');