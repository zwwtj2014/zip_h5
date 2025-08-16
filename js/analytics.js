// 简化的统计脚本
class SimpleAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        
        console.log('📊 Simple Analytics initialized');
    }
    
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    
    // 基本统计方法 - 只在控制台输出，不发送到服务器
    log(event, data = {}) {
        const logData = {
            event: event,
            session_id: this.sessionId,
            timestamp: Date.now(),
            page: window.location.pathname,
            ...data
        };
        
        // 只在开发环境输出
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('📊 Stats:', event, logData);
        }
    }
    
    // 页面访问统计
    pageView(pageName, extraData = {}) {
        this.log('page_view', {
            page_name: pageName,
            ...extraData
        });
    }
    
    // 页面离开统计
    pageLeave(pageName, duration) {
        this.log('page_leave', {
            page_name: pageName,
            duration: Math.round(duration / 1000) // 转换为秒
        });
    }
    
    // 简单的按钮点击统计
    buttonClick(buttonName) {
        this.log('button_click', {
            button_name: buttonName
        });
    }
    
    // 文件操作统计
    fileSelect(fileCount, totalSize) {
        this.log('file_select', {
            file_count: fileCount,
            total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
        });
    }
    
    fileAction(action, fileName = '') {
        this.log('file_action', {
            action: action,
            file_type: fileName ? fileName.split('.').pop() : ''
        });
    }
    
    fileDragDrop(fileCount, totalSize) {
        this.log('file_drag_drop', {
            file_count: fileCount,
            total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
        });
    }
    
    // 压缩统计
    compressStart(fileCount, totalSize) {
        this.compressStartTime = Date.now();
        this.log('compress_start', {
            file_count: fileCount,
            total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
        });
    }
    
    compressComplete(originalSize, compressedSize, fileCount) {
        const duration = Date.now() - (this.compressStartTime || Date.now());
        this.log('compress_complete', {
            file_count: fileCount,
            duration_seconds: Math.round(duration / 1000),
            compression_ratio: originalSize > 0 ? Math.round(((originalSize - compressedSize) / originalSize * 100)) : 0
        });
    }
    
    compressError(error) {
        this.log('compress_error', {
            error_type: error.name || 'Error'
        });
    }
    
    // 下载统计
    downloadStart(downloadType, fileSize) {
        this.downloadStartTime = Date.now();
        this.log('download_start', {
            download_type: downloadType,
            file_size_mb: Math.round(fileSize / (1024 * 1024) * 100) / 100
        });
    }
    
    downloadComplete(downloadType, fileSize) {
        const duration = Date.now() - (this.downloadStartTime || Date.now());
        this.log('download_complete', {
            download_type: downloadType,
            duration_seconds: Math.round(duration / 1000)
        });
    }
    
    // 付费相关统计（简化）
    paymentShow(reason) {
        this.log('payment_modal_show', { reason: reason });
    }
    
    paymentChoice(paymentType) {
        this.log('payment_choice', { payment_type: paymentType });
    }
    
    phoneBinding(success) {
        this.log('phone_binding', { success: success });
    }
    
    vipPurchase(plan, price) {
        this.log('vip_purchase_attempt', { plan: plan, price: price });
    }
    
    // 基本错误记录
    error(errorType, errorMessage) {
        this.log('error', {
            error_type: errorType,
            error_message: errorMessage
        });
    }
    
    // 模态框统计
    modalOpen(modalName) {
        this.log('modal_open', { modal_name: modalName });
    }
    
    modalClose(modalName) {
        this.log('modal_close', { modal_name: modalName });
    }
    
    // 通用事件统计
    track(event, data = {}) {
        this.log(event, data);
    }
}

// 全局实例
window.analytics = new SimpleAnalytics();

// 页面离开时的统计
let pageStartTime = Date.now();
let currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

window.addEventListener('beforeunload', () => {
    const duration = Date.now() - pageStartTime;
    window.analytics.pageLeave(currentPage, duration);
});

// 基本错误监听
window.addEventListener('error', (event) => {
    window.analytics.error('javascript_error', event.message);
});