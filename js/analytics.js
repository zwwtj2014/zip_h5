// 运维打点上报功能
class Analytics {
    constructor() {
        this.baseUrl = 'https://log.xiexinbao.com/user/log.gif';
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.deviceInfo = this.getDeviceInfo();
        
        // 初始化打点
        this.track('system_init', {
            timestamp: Date.now(),
            page_load_time: performance.now()
        });
    }
    
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    
    getUserId() {
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            localStorage.setItem('user_id', userId);
        }
        return userId;
    }
    
    getDeviceInfo() {
        return {
            user_agent: navigator.userAgent,
            screen_width: screen.width,
            screen_height: screen.height,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            device_type: this.getDeviceType(),
            browser: this.getBrowserInfo(),
            platform: navigator.platform,
            language: navigator.language
        };
    }
    
    getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
            return 'mobile';
        }
        if (/tablet|ipad/i.test(userAgent)) {
            return 'tablet';
        }
        return 'desktop';
    }
    
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
        if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
        if (userAgent.indexOf('Safari') > -1) return 'Safari';
        if (userAgent.indexOf('Edge') > -1) return 'Edge';
        return 'Unknown';
    }
    
    // 核心打点方法
    track(event, data = {}) {
        const params = {
            event: event,
            session_id: this.sessionId,
            user_id: this.userId,
            timestamp: Date.now(),
            url: window.location.href,
            page: window.location.pathname,
            referrer: document.referrer || '',
            ...this.deviceInfo,
            ...data
        };
        
        // 构建查询参数
        const queryString = Object.keys(params)
            .map(key => {
                const value = typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key];
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            })
            .join('&');
        
        // 使用 Image 对象发送请求（避免跨域问题）
        const img = new Image();
        img.src = `${this.baseUrl}?${queryString}`;
        
        // 开发环境下输出日志
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('📊 Analytics:', event, params);
        }
        
        // 备用方案：使用 navigator.sendBeacon（如果支持）
        if (navigator.sendBeacon && event.includes('page_leave')) {
            const formData = new FormData();
            Object.keys(params).forEach(key => {
                formData.append(key, typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]);
            });
            navigator.sendBeacon(this.baseUrl, formData);
        }
    }
    
    // 页面访问打点
    pageView(pageName, extraData = {}) {
        this.track('page_view', {
            page_name: pageName,
            load_time: performance.now(),
            ...extraData
        });
    }
    
    // 页面离开打点
    pageLeave(pageName, duration) {
        this.track('page_leave', {
            page_name: pageName,
            duration: duration,
            scroll_depth: this.getScrollDepth()
        });
    }
    
    getScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        return docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
    }
    
    // 文件操作相关打点
    fileSelect(fileCount, totalSize, fileTypes = []) {
        this.track('file_select', {
            file_count: fileCount,
            total_size: totalSize,
            total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
            file_types: fileTypes,
            avg_file_size: fileCount > 0 ? Math.round(totalSize / fileCount) : 0
        });
    }
    
    fileAction(action, fileName, fileSize = 0, extraData = {}) {
        this.track('file_action', {
            action: action,
            file_name: fileName ? fileName.split('.').pop() : '', // 只记录扩展名
            file_size: fileSize,
            file_size_mb: (fileSize / (1024 * 1024)).toFixed(2),
            ...extraData
        });
    }
    
    fileDragDrop(fileCount, totalSize) {
        this.track('file_drag_drop', {
            file_count: fileCount,
            total_size: totalSize,
            total_size_mb: (totalSize / (1024 * 1024)).toFixed(2)
        });
    }
    
    // 压缩相关打点
    compressStart(fileCount, totalSize, fileTypes = []) {
        this.compressStartTime = Date.now();
        this.track('compress_start', {
            file_count: fileCount,
            total_size: totalSize,
            total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
            file_types: fileTypes,
            avg_file_size: fileCount > 0 ? Math.round(totalSize / fileCount) : 0
        });
    }
    
    compressComplete(originalSize, compressedSize, fileCount) {
        const duration = Date.now() - (this.compressStartTime || Date.now());
        const compressionRatio = originalSize > 0 ? ((originalSize - compressedSize) / originalSize * 100) : 0;
        
        this.track('compress_complete', {
            original_size: originalSize,
            compressed_size: compressedSize,
            original_size_mb: (originalSize / (1024 * 1024)).toFixed(2),
            compressed_size_mb: (compressedSize / (1024 * 1024)).toFixed(2),
            compression_ratio: compressionRatio.toFixed(2),
            duration: duration,
            duration_seconds: (duration / 1000).toFixed(2),
            file_count: fileCount,
            compression_speed: originalSize > 0 ? (originalSize / duration * 1000).toFixed(0) : 0 // bytes per second
        });
    }
    
    compressError(error, fileCount, totalSize) {
        this.track('compress_error', {
            error_message: error.message || error,
            error_type: error.name || 'UnknownError',
            file_count: fileCount,
            total_size: totalSize,
            total_size_mb: (totalSize / (1024 * 1024)).toFixed(2)
        });
    }
    
    // 下载相关打点
    downloadStart(downloadType, fileSize, fileName = '') {
        this.downloadStartTime = Date.now();
        this.track('download_start', {
            download_type: downloadType,
            file_size: fileSize,
            file_size_mb: (fileSize / (1024 * 1024)).toFixed(2),
            file_name: fileName.split('.').pop() // 只记录扩展名
        });
    }
    
    downloadComplete(downloadType, fileSize) {
        const duration = Date.now() - (this.downloadStartTime || Date.now());
        this.track('download_complete', {
            download_type: downloadType,
            file_size: fileSize,
            file_size_mb: (fileSize / (1024 * 1024)).toFixed(2),
            duration: duration,
            duration_seconds: (duration / 1000).toFixed(2),
            download_speed: fileSize > 0 ? (fileSize / duration * 1000).toFixed(0) : 0 // bytes per second
        });
    }
    
    // 付费相关打点
    paymentShow(reason, fileSize) {
        this.track('payment_modal_show', {
            reason: reason,
            file_size: fileSize,
            file_size_mb: (fileSize / (1024 * 1024)).toFixed(2)
        });
    }
    
    paymentChoice(paymentType, fileSize) {
        this.track('payment_choice', {
            payment_type: paymentType,
            file_size: fileSize,
            file_size_mb: (fileSize / (1024 * 1024)).toFixed(2)
        });
    }
    
    phoneBinding(success, phone = '') {
        this.track('phone_binding', {
            success: success,
            phone_provided: phone.length > 0,
            phone_length: phone.length
        });
    }
    
    vipPurchase(plan, price) {
        this.track('vip_purchase_attempt', {
            plan: plan,
            price: price
        });
    }
    
    // 错误打点
    error(errorType, errorMessage, context = {}) {
        this.track('error', {
            error_type: errorType,
            error_message: errorMessage,
            error_context: context,
            stack_trace: new Error().stack
        });
    }
    
    // 用户交互打点
    buttonClick(buttonName, context = {}) {
        this.track('button_click', {
            button_name: buttonName,
            button_context: context
        });
    }
    
    modalOpen(modalName) {
        this.track('modal_open', {
            modal_name: modalName
        });
    }
    
    modalClose(modalName, duration) {
        this.track('modal_close', {
            modal_name: modalName,
            modal_duration: duration
        });
    }
    
    // 性能监控
    performance(metrics) {
        this.track('performance', {
            ...metrics,
            memory_used: performance.memory ? performance.memory.usedJSHeapSize : 0,
            memory_total: performance.memory ? performance.memory.totalJSHeapSize : 0
        });
    }
}

// 全局分析实例
window.analytics = new Analytics();

// 页面离开时的打点
let pageStartTime = Date.now();
let currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

window.addEventListener('beforeunload', () => {
    const duration = Date.now() - pageStartTime;
    window.analytics.pageLeave(currentPage, duration);
});

// 页面可见性变化打点
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        window.analytics.track('page_hidden', {
            page_name: currentPage,
            duration_visible: Date.now() - pageStartTime
        });
    } else {
        window.analytics.track('page_visible', {
            page_name: currentPage
        });
        pageStartTime = Date.now();
    }
});

// 错误监听
window.addEventListener('error', (event) => {
    window.analytics.error('javascript_error', event.message, {
        filename: event.filename,
        line: event.lineno,
        column: event.colno
    });
});

// Promise 错误监听
window.addEventListener('unhandledrejection', (event) => {
    window.analytics.error('promise_rejection', event.reason, {
        type: 'unhandled_promise_rejection'
    });
});

console.log('📊 Analytics initialized');