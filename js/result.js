// 结果页面逻辑
function ResultPage() {
    this.compressResult = null;
    this.startTime = Date.now();
    this.init();
}

ResultPage.prototype.init = function() {
    this.loadCompressResult();
    this.bindEvents();
    
    console.log('📊 ResultPage initialized');
};
    
ResultPage.prototype.loadCompressResult = function() {
    var self = this;
    // 从sessionStorage获取压缩结果
    var resultData = sessionStorage.getItem('compressResult');
    
    if (!resultData) {
        console.log('⚠️ No compress result found, redirecting to index');
        this.showToast('⚠️ 未找到压缩结果，请重新压缩文件');
        setTimeout(function() {
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
        console.error('❌ 解析压缩结果失败:', error.message);
        this.redirectToIndex();
    }
};
    
ResultPage.prototype.displayResult = function() {
    if (!this.compressResult) return;
    
    var fileNameDisplay = document.getElementById('fileNameDisplay');
    var fileSizeElement = document.getElementById('fileSize');
    var fileCountElement = document.getElementById('fileCount');
    
    // 设置文件名显示 - 只显示随机数部分
    if (fileNameDisplay) {
        var originalFileName = this.compressResult.fileName || 'compressed_files';
        // 提取随机数部分（数字）
        var match = originalFileName.match(/\d{13}$/);
        var displayName = match ? match[0] : originalFileName;
        fileNameDisplay.textContent = displayName;
    }
    
    // 设置文件大小信息
    if (fileSizeElement) {
        fileSizeElement.textContent = this.formatFileSize(this.compressResult.compressedSize);
    }
    
    // 设置文件数量
    if (fileCountElement) {
        fileCountElement.textContent = (this.compressResult.fileCount || 0) + ' 个';
    }
    
    // 添加动画效果
    this.addDisplayAnimations();
};
    
ResultPage.prototype.addDisplayAnimations = function() {
    // 为文件信息添加动画
    var filePreview = document.querySelector('.file-preview');
    if (filePreview) {
        filePreview.style.opacity = '0';
        filePreview.style.transform = 'translateY(20px)';
        
        setTimeout(function() {
            filePreview.style.transition = 'all 0.6s ease-out';
            filePreview.style.opacity = '1';
            filePreview.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // 为下载按钮添加脉动效果
    var downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        setTimeout(function() {
            downloadBtn.style.animation = 'pulse 2s infinite';
        }, 1000);
    }
};
    
ResultPage.prototype.bindEvents = function() {
    var self = this;
    var downloadBtn = document.getElementById('downloadBtn');
    var editNameBtn = document.getElementById('editNameBtn');
    var renameModal = document.getElementById('renameModal');
    var closeRenameModal = document.getElementById('closeRenameModal');
    var cancelRename = document.getElementById('cancelRename');
    var confirmRename = document.getElementById('confirmRename');
    var fileNameInput = document.getElementById('fileNameInput');
    
    // 下载按钮
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            self.handleDownload();
        });
    }
    
    // 编辑文件名按钮
    if (editNameBtn) {
        editNameBtn.addEventListener('click', function() {
            self.showRenameModal();
        });
    }
    
    // 重命名弹框事件
    if (closeRenameModal) {
        closeRenameModal.addEventListener('click', function() {
            self.hideRenameModal();
        });
    }
    
    if (cancelRename) {
        cancelRename.addEventListener('click', function() {
            self.hideRenameModal();
        });
    }
    
    if (confirmRename) {
        confirmRename.addEventListener('click', function() {
            self.updateFileName();
        });
    }
    
    if (fileNameInput) {
        fileNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                self.updateFileName();
            }
        });
    }
    
    // 点击背景关闭弹框
    if (renameModal) {
        renameModal.addEventListener('click', function(e) {
            if (e.target === renameModal) {
                self.hideRenameModal();
            }
        });
    }
};
    
ResultPage.prototype.showRenameModal = function() {
    var renameModal = document.getElementById('renameModal');
    var fileNameInput = document.getElementById('fileNameInput');
    
    if (renameModal && fileNameInput) {
        // 设置当前文件名 - 只显示随机数部分
        var originalFileName = (this.compressResult && this.compressResult.fileName) || 'compressed_files';
        var match = originalFileName.match(/\d{13}$/);
        var displayName = match ? match[0] : originalFileName;
        fileNameInput.value = displayName;
        renameModal.style.display = 'flex';
        
        // 聚焦并选中文本
        setTimeout(function() {
            fileNameInput.focus();
            fileNameInput.select();
        }, 100);
    }
};
    
ResultPage.prototype.hideRenameModal = function() {
    var renameModal = document.getElementById('renameModal');
    if (renameModal) {
        renameModal.style.display = 'none';
    }
};
    
ResultPage.prototype.updateFileName = function() {
    var fileNameInput = document.getElementById('fileNameInput');
    var fileNameDisplay = document.getElementById('fileNameDisplay');
    
    if (!fileNameInput || !this.compressResult) return;
    
    var newName = fileNameInput.value.trim();
    
    if (newName === '') {
        this.showToast('⚠️ 文件名不能为空');
        return;
    }
    
    // 更新文件名
    this.compressResult.fileName = newName;
    
    // 更新显示
    if (fileNameDisplay) {
        fileNameDisplay.textContent = newName;
    }
    
    // 更新sessionStorage
    sessionStorage.setItem('compressResult', JSON.stringify(this.compressResult));
    
    // 隐藏弹框
    this.hideRenameModal();
    
    this.showToast('✏️ 文件名已更新');
};
    
ResultPage.prototype.handleDownload = function() {
    if (!this.compressResult) {
        this.showToast('❌ 下载数据丢失，请重新压缩');
        this.redirectToIndex();
        return;
    }
    
    // 检查下载权限
    if (window.paymentSystem) {
        var permission = window.paymentSystem.checkDownloadPermission(this.compressResult.compressedSize);
        
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
    } else {
        // 默认直接下载
        this.startDownload('free');
    }
};
    
ResultPage.prototype.startDownload = function(downloadType) {
    // 检查是否有压缩数据
    var compressedBlob = window.compressedBlob;
    
    if (!compressedBlob) {
        this.showToast('❌ 下载数据丢失，请重新压缩');
        this.redirectToIndex();
        return;
    }
    
    // 下载开始日志
    console.log('📥 开始下载:', downloadType, '文件大小:', (this.compressResult.compressedSize / (1024 * 1024)).toFixed(2) + 'MB');
    
    try {
        // 创建下载链接
        var url = URL.createObjectURL(compressedBlob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (this.compressResult.fileName || 'compressed_files') + '.zip';
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 释放URL对象
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 1000);
        
        // 下载完成日志
        console.log('✅ 下载完成:', downloadType);
        
        // 成功提示
        this.showDownloadSuccess(downloadType);
        
        console.log('📥 Download completed:', downloadType);
        
    } catch (error) {
        console.error('❌ Download error:', error);
        console.error('❌ 下载失败:', error.message);
        this.showToast('❌ 下载失败，请重试');
    }
};
    
ResultPage.prototype.showDownloadSuccess = function(downloadType) {
    var message = '⬇️ 下载已开始！';
    
    if (downloadType === 'vip') {
        message = '👑 VIP高速下载已开始！';
    } else if (downloadType === 'free_with_phone') {
        message = '📱 免费下载已开始！';
    }
    
    this.showToast(message, 'success');
    
    // 更新下载按钮状态
    var downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        var originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span class="btn-icon">✅</span>下载完成';
        downloadBtn.disabled = true;
        
        setTimeout(function() {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }, 3000);
    }
};
    
ResultPage.prototype.redirectToIndex = function() {
    setTimeout(function() {
        window.location.href = 'index.html';
    }, 2000);
};
    
// 工具方法
ResultPage.prototype.formatFileSize = function(bytes) {
    if (bytes === 0) return '0 B';
    
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
    
ResultPage.prototype.showToast = function(message, type) {
    type = type || 'info';
    if (window.customToast && typeof window.customToast.show === 'function') {
        window.customToast.show(message, type);
    } else {
        // 使用简单toast
        this.createSimpleToast(message, type);
    }
};
    
ResultPage.prototype.createSimpleToast = function(message, type) {
    // 移除现有的toast
    var existingToast = document.querySelector('.result-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    var toast = document.createElement('div');
    toast.className = 'result-toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(0, 0, 0, 0.8); color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; font-size: 14px; max-width: 300px; backdrop-filter: blur(10px); animation: slideInRight 0.3s ease-out;';
    
    if (type === 'success') {
        toast.style.background = 'rgba(76, 175, 80, 0.9)';
    } else if (type === 'error') {
        toast.style.background = 'rgba(244, 67, 54, 0.9)';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(function() {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
};

// 添加脉动动画CSS
var style = document.createElement('style');
style.textContent = '@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } } @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
document.head.appendChild(style);

// 初始化结果页面
var resultPage = new ResultPage();

// 导出给其他脚本使用
window.resultPage = resultPage;