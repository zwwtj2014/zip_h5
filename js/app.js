// 首页应用逻辑
class App {
    constructor() {
        this.selectedFiles = [];
        this.startTime = Date.now();
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupDragAndDrop();
        
        // 页面访问打点
        window.analytics.pageView('index', {
            entry_time: new Date().toISOString()
        });
        
        console.log('🚀 App initialized');
    }
    
    bindEvents() {
        const uploadBox = document.getElementById('uploadBox');
        const fileInput = document.getElementById('fileInput');
        const nextBtn = document.getElementById('nextBtn');
        const clearBtn = document.getElementById('clearBtn');
        
        // 文件选择事件
        uploadBox.addEventListener('click', () => {
            window.analytics.buttonClick('upload_box_click');
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files, 'file_input');
        });
        
        // 按钮事件
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                window.analytics.buttonClick('next_button', {
                    file_count: this.selectedFiles.length,
                    total_size: this.getTotalSize()
                });
                this.goToFileManager();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                window.analytics.buttonClick('clear_button', {
                    file_count: this.selectedFiles.length
                });
                this.clearFiles();
            });
        }
    }
    
    setupDragAndDrop() {
        const uploadBox = document.getElementById('uploadBox');
        
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('dragover');
        });
        
        uploadBox.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('dragover');
        });
        
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                window.analytics.fileDragDrop(files.length, this.calculateTotalSize(files));
                this.handleFileSelect(files, 'drag_drop');
            }
        });
    }
    
    handleFileSelect(files, source = 'unknown') {
        if (files.length === 0) return;
        
        // 重新选择文件（按用户要求，每次重新选择）
        this.selectedFiles = Array.from(files);
        
        // 获取文件类型统计
        const fileTypes = this.getFileTypes(this.selectedFiles);
        const totalSize = this.getTotalSize();
        
        // 文件选择打点
        window.analytics.fileSelect(files.length, totalSize, fileTypes);
        
        // 显示选择的文件
        this.displaySelectedFiles();
        
        // 显示成功提示
        this.showToast(`✅ 已选择 ${files.length} 个文件，总大小 ${this.formatFileSize(totalSize)}`);
        
        // 滚动到文件列表
        setTimeout(() => {
            document.getElementById('selectedFiles')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 300);
    }
    
    displaySelectedFiles() {
        const selectedFilesDiv = document.getElementById('selectedFiles');
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        
        selectedFilesDiv.style.display = 'block';
        fileList.innerHTML = '';
        
        // 更新文件计数
        if (fileCount) {
            fileCount.textContent = `${this.selectedFiles.length} 个文件`;
        }
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.style.animationDelay = `${index * 0.1}s`;
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">${this.getFileIcon(file.name)}</div>
                    <div class="file-details">
                        <h4 title="${file.name}">${this.truncateFileName(file.name, 30)}</h4>
                        <p class="file-size">${this.formatFileSize(file.size)}</p>
                        <p class="file-type">${file.type || '未知类型'}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-danger btn-small" onclick="app.removeFile(${index})" title="删除文件">
                        🗑️ 删除
                    </button>
                </div>
            `;
            fileList.appendChild(fileItem);
        });
    }
    
    removeFile(index) {
        const file = this.selectedFiles[index];
        
        // 文件删除打点
        window.analytics.fileAction('remove', file.name, file.size);
        
        this.selectedFiles.splice(index, 1);
        
        if (this.selectedFiles.length === 0) {
            document.getElementById('selectedFiles').style.display = 'none';
        } else {
            this.displaySelectedFiles();
        }
        
        this.showToast(`🗑️ 已删除文件 ${this.truncateFileName(file.name, 20)}`);
    }
    
    clearFiles() {
        const fileCount = this.selectedFiles.length;
        this.selectedFiles = [];
        document.getElementById('selectedFiles').style.display = 'none';
        
        this.showToast(`🧹 已清空 ${fileCount} 个文件`);
    }
    
    goToFileManager() {
        if (this.selectedFiles.length === 0) {
            this.showToast('⚠️ 请先选择文件');
            return;
        }
        
        // 简化的文件传递方案：使用 sessionStorage 存储基本信息，文件对象存储在全局变量
        const fileData = this.selectedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type || '',
            lastModified: file.lastModified
        }));
        
        try {
            sessionStorage.setItem('selectedFilesData', JSON.stringify(fileData));
            // 文件对象存储在全局变量中（按用户要求的简化方案）
            window.selectedFilesForTransfer = this.selectedFiles;
            
            // 页面跳转打点
            window.analytics.track('page_navigate', {
                from: 'index',
                to: 'file_manager',
                file_count: this.selectedFiles.length,
                total_size: this.getTotalSize()
            });
            
            window.location.href = 'file-manager.html';
        } catch (error) {
            window.analytics.error('file_transfer_error', error.message);
            this.showToast('❌ 文件传递失败，请重试');
        }
    }
    
    // 工具方法
    getFileTypes(files) {
        const types = {};
        files.forEach(file => {
            const ext = this.getFileExtension(file.name);
            types[ext] = (types[ext] || 0) + 1;
        });
        return types;
    }
    
    getFileExtension(fileName) {
        return fileName.split('.').pop().toLowerCase() || 'unknown';
    }
    
    getTotalSize() {
        return this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
    }
    
    calculateTotalSize(files) {
        return Array.from(files).reduce((sum, file) => sum + file.size, 0);
    }
    
    truncateFileName(fileName, maxLength) {
        if (fileName.length <= maxLength) return fileName;
        
        const ext = fileName.split('.').pop();
        const name = fileName.substring(0, fileName.lastIndexOf('.'));
        const truncatedName = name.substring(0, maxLength - ext.length - 4) + '...';
        
        return `${truncatedName}.${ext}`;
    }
    
    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            // 文档类
            'pdf': '📄',
            'doc': '📝', 'docx': '📝',
            'xls': '📊', 'xlsx': '📊', 'csv': '📊',
            'ppt': '📈', 'pptx': '📈',
            'txt': '📃', 'rtf': '📃',
            
            // 图片类
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'bmp': '🖼️', 'svg': '🖼️', 'webp': '🖼️', 'ico': '🖼️',
            
            // 视频类
            'mp4': '🎥', 'avi': '🎥', 'mov': '🎥', 'wmv': '🎥',
            'flv': '🎥', 'mkv': '🎥', 'webm': '🎥',
            
            // 音频类
            'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵',
            'ogg': '🎵', 'm4a': '🎵',
            
            // 压缩类
            'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦',
            'gz': '📦', 'bz2': '📦',
            
            // 代码类
            'js': '📜', 'css': '📜', 'html': '📜', 'php': '📜',
            'py': '📜', 'java': '📜', 'cpp': '📜', 'c': '📜',
            
            // 其他
            'exe': '⚙️', 'dmg': '⚙️', 'app': '⚙️',
            'json': '📋', 'xml': '📋', 'yml': '📋', 'yaml': '📋'
        };
        
        return iconMap[ext] || '📄';
    }
    
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
            // 备用方案：创建简单的toast
            this.createSimpleToast(message, type);
        }
    }
    
    createSimpleToast(message, type) {
        // 移除现有的toast
        const existingToast = document.querySelector('.simple-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `simple-toast toast-${type}`;
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
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
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

// 初始化应用
const app = new App();

// 导出给其他脚本使用
window.app = app;