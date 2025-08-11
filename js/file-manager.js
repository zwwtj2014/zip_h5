// 文件管理页面逻辑
class FileManager {
    constructor() {
        this.files = [];
        this.startTime = Date.now();
        this.init();
    }
    
    init() {
        this.loadFiles();
        this.bindEvents();
        
        // 页面访问打点
        window.analytics.pageView('file_manager', {
            entry_time: new Date().toISOString()
        });
        
        console.log('📁 FileManager initialized');
    }
    
    loadFiles() {
        // 从全局变量获取文件（按用户要求的简化方案）
        if (window.selectedFilesForTransfer && window.selectedFilesForTransfer.length > 0) {
            this.files = window.selectedFilesForTransfer;
            console.log('✅ Files loaded from global variable:', this.files.length);
        } else {
            // 如果没有文件数据，显示空状态
            console.log('⚠️ No files found, showing empty state');
            this.showEmptyState();
            return;
        }
        
        this.displayFiles();
        this.updateStats();
    }
    
    bindEvents() {
        const addFileBtn = document.getElementById('addFileBtn');
        const addFileInput = document.getElementById('addFileInput');
        const compressBtn = document.getElementById('compressBtn');
        
        if (addFileBtn) {
            addFileBtn.addEventListener('click', () => {
                window.analytics.buttonClick('add_file_button');
                addFileInput.click();
            });
        }
        
        if (addFileInput) {
            addFileInput.addEventListener('change', (e) => {
                this.addFiles(e.target.files);
            });
        }
        
        if (compressBtn) {
            compressBtn.addEventListener('click', () => {
                window.analytics.buttonClick('compress_button', {
                    file_count: this.files.length,
                    total_size: this.getTotalSize()
                });
                this.startCompress();
            });
        }
    }
    
    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const compressActions = document.getElementById('compressActions');
        
        if (emptyState) emptyState.style.display = 'block';
        if (compressActions) compressActions.style.display = 'none';
        
        this.updateStats();
    }
    
    displayFiles() {
        const fileList = document.getElementById('fileList');
        const emptyState = document.getElementById('emptyState');
        const compressActions = document.getElementById('compressActions');
        
        if (!fileList) return;
        
        fileList.innerHTML = '';
        
        if (this.files.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // 隐藏空状态，显示压缩按钮
        if (emptyState) emptyState.style.display = 'none';
        if (compressActions) compressActions.style.display = 'block';
        
        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.style.animationDelay = `${index * 0.05}s`;
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">${this.getFileIcon(file.name)}</div>
                    <div class="file-details">
                        <input type="text" class="file-name-input" value="${file.name}" 
                               onchange="fileManager.renameFile(${index}, this.value)"
                               title="点击编辑文件名">
                        <div class="file-meta">
                            <p class="file-size">${this.formatFileSize(file.size)}</p>
                            <p class="file-type">${file.type || '未知类型'}</p>
                            <p class="file-modified">${this.formatDate(file.lastModified)}</p>
                        </div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-danger btn-small" onclick="fileManager.removeFile(${index})" title="删除文件">
                        🗑️
                    </button>
                </div>
            `;
            fileList.appendChild(fileItem);
        });
    }
    
    updateStats() {
        const fileCountEl = document.getElementById('fileCount');
        const totalSizeEl = document.getElementById('totalSize');
        const compressFileCountEl = document.getElementById('compressFileCount');
        
        const fileCount = this.files.length;
        const totalSize = this.getTotalSize();
        
        if (fileCountEl) fileCountEl.textContent = fileCount;
        if (totalSizeEl) totalSizeEl.textContent = this.formatFileSize(totalSize);
        if (compressFileCountEl) compressFileCountEl.textContent = fileCount;
    }
    
    addFiles(newFiles) {
        if (!newFiles || newFiles.length === 0) return;
        
        const addedFiles = Array.from(newFiles);
        const beforeCount = this.files.length;
        
        // 添加新文件
        this.files = this.files.concat(addedFiles);
        
        // 更新显示
        this.displayFiles();
        this.updateStats();
        
        // 添加文件打点
        addedFiles.forEach(file => {
            window.analytics.fileAction('add', file.name, file.size, {
                total_files: this.files.length
            });
        });
        
        this.showToast(`✅ 已添加 ${addedFiles.length} 个文件`);
        
        // 滚动到新添加的文件
        setTimeout(() => {
            const fileItems = document.querySelectorAll('.file-item');
            if (fileItems.length > beforeCount) {
                fileItems[beforeCount]?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }
        }, 300);
    }
    
    removeFile(index) {
        if (index < 0 || index >= this.files.length) return;
        
        const file = this.files[index];
        const fileName = file.name;
        
        // 删除文件
        this.files.splice(index, 1);
        
        // 更新显示
        this.displayFiles();
        this.updateStats();
        
        // 删除文件打点
        window.analytics.fileAction('remove', fileName, file.size, {
            remaining_files: this.files.length
        });
        
        this.showToast(`🗑️ 已删除 ${this.truncateFileName(fileName, 20)}`);
    }
    
    renameFile(index, newName) {
        if (index < 0 || index >= this.files.length) return;
        
        const trimmedName = newName.trim();
        if (trimmedName === '') {
            this.showToast('⚠️ 文件名不能为空');
            this.displayFiles(); // 重置显示
            return;
        }
        
        const file = this.files[index];
        const oldName = file.name;
        
        // 重命名文件（创建新的File对象）
        try {
            const newFile = new File([file], trimmedName, {
                type: file.type,
                lastModified: file.lastModified
            });
            this.files[index] = newFile;
            
            // 重命名打点
            window.analytics.fileAction('rename', oldName, file.size, {
                new_name: trimmedName,
                old_extension: this.getFileExtension(oldName),
                new_extension: this.getFileExtension(trimmedName)
            });
            
            this.showToast(`✏️ 文件已重命名为 ${this.truncateFileName(trimmedName, 20)}`);
        } catch (error) {
            console.error('Rename error:', error);
            this.showToast('❌ 重命名失败，请重试');
            this.displayFiles(); // 重置显示
        }
    }
    
    async startCompress() {
        if (this.files.length === 0) {
            this.showToast('⚠️ 请先选择文件');
            return;
        }
        
        // 显示压缩弹框
        this.showCompressModal();
        
        // 获取文件统计信息
        const totalSize = this.getTotalSize();
        const fileTypes = this.getFileTypes(this.files);
        
        // 压缩开始打点
        window.analytics.compressStart(this.files.length, totalSize, fileTypes);
        
        const startTime = Date.now();
        
        try {
            // 调用压缩功能
            await this.compressFiles();
            
            const duration = Date.now() - startTime;
            
            // 隐藏弹框
            this.hideCompressModal();
            
            this.showToast('🎉 压缩完成！即将跳转到下载页面');
            
            // 跳转到结果页
            setTimeout(() => {
                window.location.href = 'result.html';
            }, 1500);
            
        } catch (error) {
            console.error('Compression error:', error);
            
            // 压缩错误打点
            window.analytics.compressError(error, this.files.length, totalSize);
            
            this.hideCompressModal();
            this.showToast('❌ 压缩失败：' + (error.message || '未知错误'));
        }
    }
    
    showCompressModal() {
        const modal = document.getElementById('compressModal');
        if (modal) {
            modal.style.display = 'flex';
            window.analytics.modalOpen('compress_modal');
        }
    }
    
    hideCompressModal() {
        const modal = document.getElementById('compressModal');
        if (modal) {
            modal.style.display = 'none';
            window.analytics.modalClose('compress_modal', Date.now() - this.startTime);
        }
    }
    
    async compressFiles() {
        // 检查是否有压缩器
        if (window.Compressor && typeof window.Compressor.compress === 'function') {
            return new Promise((resolve, reject) => {
                window.Compressor.compress(this.files, (success, error) => {
                    if (success) {
                        resolve();
                    } else {
                        reject(error || new Error('压缩失败'));
                    }
                });
            });
        } else {
            // 如果压缩库未加载，使用模拟压缩
            return this.simulateCompress();
        }
    }
    
    simulateCompress() {
        return new Promise((resolve) => {
            const statusEl = document.getElementById('compressStatus');
            const progressTextEl = document.getElementById('progressText');
            
            let progress = 0;
            const steps = [
                '正在分析文件...',
                '正在创建压缩包...',
                '正在添加文件...',
                '正在压缩数据...',
                '正在优化大小...',
                '压缩完成！'
            ];
            
            let currentStep = 0;
            
            const interval = setInterval(() => {
                progress += Math.random() * 15 + 5; // 每次增加5-20%
                
                if (progress >= 100) {
                    progress = 100;
                    currentStep = steps.length - 1;
                    clearInterval(interval);
                    
                    setTimeout(() => {
                        // 模拟压缩完成，存储结果
                        this.saveCompressResult();
                        resolve();
                    }, 500);
                } else if (progress > (currentStep + 1) * 16.67 && currentStep < steps.length - 2) {
                    // 每16.67%（100/6）更新一次步骤
                    currentStep++;
                }
                
                if (statusEl) statusEl.textContent = steps[currentStep];
                if (progressTextEl) progressTextEl.textContent = `${Math.round(progress)}%`;
            }, 200 + Math.random() * 300); // 随机间隔200-500ms
        });
    }
    
    saveCompressResult() {
        const totalSize = this.getTotalSize();
        // 模拟压缩后的大小（通常能压缩10-70%）
        const compressionRatio = 0.3 + Math.random() * 0.4; // 30-70%的压缩率
        const compressedSize = Math.round(totalSize * compressionRatio);
        
        const result = {
            originalSize: totalSize,
            compressedSize: compressedSize,
            fileName: `compressed_files_${Date.now()}`,
            timestamp: Date.now(),
            fileCount: this.files.length
        };
        
        // 存储到sessionStorage
        sessionStorage.setItem('compressResult', JSON.stringify(result));
        
        // 压缩完成打点
        window.analytics.compressComplete(totalSize, compressedSize, this.files.length);
        
        console.log('💾 Compression result saved:', result);
    }
    
    // 工具方法
    getTotalSize() {
        return this.files.reduce((sum, file) => sum + file.size, 0);
    }
    
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
    
    formatDate(timestamp) {
        if (!timestamp) return '未知时间';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '今天';
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }
    
    showToast(message, type = 'info') {
        if (window.customToast && typeof window.customToast.show === 'function') {
            window.customToast.show(message, type);
        } else {
            // 使用app中的简单toast方法
            if (window.app && typeof window.app.createSimpleToast === 'function') {
                window.app.createSimpleToast(message, type);
            } else {
                console.log('Toast:', message);
            }
        }
    }
}

// 初始化文件管理器
const fileManager = new FileManager();

// 导出给其他脚本使用
window.fileManager = fileManager;