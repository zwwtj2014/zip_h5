// 结果页面逻辑
class ResultPage {
    constructor() {
        this.compressResult = null;
        this.startTime = Date.now();
        this.init();
    }
    
    init() {
        this.loadCompressResult();
        this.bindEvents();
        
        // 页面访问打点
        window.analytics.pageView('result', {
            entry_time: new Date().toISOString()
        });
        
        console.log('📊 ResultPage initialized');
    }
    
    loadCompressResult() {
        // 从sessionStorage获取压缩结果
        const resultData = sessionStorage.getItem('compressResult');
        
        if (!resultData) {
            console.log('⚠️ No compress result found, redirecting to index');
            this.showToast('⚠️ 未找到压缩结果，请重新压缩文件');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        try {
            this.compressResult = JSON.parse(resultData);
            console.log('✅ Compress result loaded:', this.compressResult);
            this.displayResult();
        } catch (error) {
            console.error('❌ Failed to parse compress result:', error);
            window.analytics.error('result_parse_error', error.message);
            this.redirectToIndex();
        }
    }
    
    displayResult() {
        if (!this.compressResult) return;
        
        const fileNameInput = document.getElementById('fileName');
        const fileSizeElement = document.getElementById('fileSize');
        const originalSizeElement = document.getElementById('originalSize');
        const compressionRatioDiv = document.getElementById('compressionRatio');
        const ratioValueElement = document.getElementById('ratioValue');
        
        // 设置文件名
        if (fileNameInput) {
            fileNameInput.value = this.compressResult.fileName || 'compressed_files';
        }
        
        // 设置文件大小信息
        if (fileSizeElement) {
            fileSizeElement.textContent = `压缩后大小: ${this.formatFileSize(this.compressResult.compressedSize)}`;
        }
        
        if (originalSizeElement) {
            originalSizeElement.textContent = `原始大小: ${this.formatFileSize(this.compressResult.originalSize)}`;
        }
        
        // 计算并显示压缩率
        if (this.compressResult.originalSize > 0) {
            const compressionRatio = ((this.compressResult.originalSize - this.compressResult.compressedSize) / this.compressResult.originalSize * 100);
            
            if (compressionRatio > 0) {
                if (compressionRatioDiv) compressionRatioDiv.style.display = 'flex';
                if (ratioValueElement) {
                    ratioValueElement.textContent = `节省 ${compressionRatio.toFixed(1)}%`;
                }
            }
        }
        
        // 添加动画效果
        this.addDisplayAnimations();
    }
    
    addDisplayAnimations() {
        // 为文件信息添加动画
        const filePreview = document.querySelector('.file-preview');
        if (filePreview) {
            filePreview.style.opacity = '0';
            filePreview.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                filePreview.style.transition = 'all 0.6s ease-out';
                filePreview.style.opacity = '1';
                filePreview.style.transform = 'translateY(0)';
            }, 100);
        }
        
        // 为下载按钮添加脉动效果
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            setTimeout(() => {
                downloadBtn.style.animation = 'pulse 2s infinite';
            }, 1000);
        }
    }
    
    bindEvents() {
        const downloadBtn = document.getElementById('downloadBtn');
        const fileNameInput = document.getElementById('fileName');
        const editNameBtn = document.getElementById('editNameBtn');
        
        // 下载按钮
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                window.analytics.buttonClick('download_button', {
                    file_size: this.compressResult?.compressedSize || 0
                });
                this.handleDownload();
            });
        }
        
        // 文件名编辑
        if (fileNameInput) {
            fileNameInput.addEventListener('change', () => {
                this.updateFileName();
            });
            
            fileNameInput.addEventListener('focus', () => {
                fileNameInput.select();
            });
        }
        
        if (editNameBtn) {
            editNameBtn.addEventListener('click', () => {
                if (fileNameInput) {
                    fileNameInput.focus();
                    fileNameInput.select();
                }
            });
        }
    }
    
    updateFileName() {
        const fileNameInput = document.getElementById('fileName');
        if (!fileNameInput || !this.compressResult) return;
        
        const newName = fileNameInput.value.trim();
        
        if (newName === '') {
            this.showToast('⚠️ 文件名不能为空');
            fileNameInput.value = this.compressResult.fileName;
            return;
        }
        
        // 更新文件名
        this.compressResult.fileName = newName;
        
        // 更新sessionStorage
        sessionStorage.setItem('compressResult', JSON.stringify(this.compressResult));
        
        // 文件重命名打点
        window.analytics.fileAction('rename_download', newName, this.compressResult.compressedSize);
        
        this.showToast('✏️ 文件名已更新');
    }
    
    handleDownload() {
        if (!this.compressResult) {
            this.showToast('❌ 下载数据丢失，请重新压缩');
            this.redirectToIndex();
            return;
        }
        
        // 检查下载权限
        const permission = window.paymentSystem.checkDownloadPermission(this.compressResult.compressedSize);
        
        if (permission.allowed) {
            // 直接下载
            this.startDownload(permission.type);
        } else {
            // 显示付费弹框
            window.paymentSystem.showPaymentModal(
                this.compressResult.compressedSize, 
                permission.reason
            );
        }
    }
    
    startDownload(downloadType) {
        // 检查是否有压缩数据
        const compressedBlob = window.compressedBlob;
        
        if (!compressedBlob) {
            this.showToast('❌ 下载数据丢失，请重新压缩');
            this.redirectToIndex();
            return;
        }
        
        // 下载开始打点
        window.analytics.downloadStart(downloadType, this.compressResult.compressedSize, this.compressResult.fileName);
        
        try {
            // 创建下载链接
            const url = URL.createObjectURL(compressedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (this.compressResult.fileName || 'compressed_files') + '.zip';
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 释放URL对象
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            // 下载完成打点
            window.analytics.downloadComplete(downloadType, this.compressResult.compressedSize);
            
            // 成功提示
            this.showDownloadSuccess(downloadType);
            
            console.log('📥 Download completed:', downloadType);
            
        } catch (error) {
            console.error('❌ Download error:', error);
            window.analytics.error('download_error', error.message);
            this.showToast('❌ 下载失败，请重试');
        }
    }
    
    showDownloadSuccess(downloadType) {
        let message = '⬇️ 下载已开始！';
        
        if (downloadType === 'vip') {
            message = '👑 VIP高速下载已开始！';
        } else if (downloadType === 'free_with_phone') {
            message = '📱 免费下载已开始！';
        }
        
        this.showToast(message, 'success');
        
        // 更新下载按钮状态
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<span class="btn-icon">✅</span>下载完成';
            downloadBtn.disabled = true;
            
            setTimeout(() => {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }, 3000);
        }
    }
    
    redirectToIndex() {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
    
    // 工具方法
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
    
    showToast(message, type = 'info') {
        if (window.customToast && typeof window.customToast.show === 'function') {
            window.customToast.show(message, type);
        } else {
            // 使用简单toast
            this.createSimpleToast(message, type);
        }
    }
    
    createSimpleToast(message, type) {
        // 移除现有的toast
        const existingToast = document.querySelector('.result-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `result-toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
        `;
        
        if (type === 'success') {
            toast.style.background = 'rgba(76, 175, 80, 0.9)';
        } else if (type === 'error') {
            toast.style.background = 'rgba(244, 67, 54, 0.9)';
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 添加脉动动画CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// 初始化结果页面
const resultPage = new ResultPage();

// 导出给其他脚本使用
window.resultPage = resultPage;