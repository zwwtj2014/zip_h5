/**
 * 页面组件模块化系统 - 重构版
 * 每个组件自包含CSS、HTML、JS，提供统一接口，组件间相互隔离
 */
window.PageComponents = {};

/**
 * 基础组件类
 */
class BaseComponent {
    constructor(config = {}) {
        this.config = config;
        this.element = null;
        this.isVisible = false;
        this.componentId = `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 注入组件专用CSS
    injectStyles(css) {
        if (!document.querySelector(`#${this.componentId}_styles`)) {
            const style = document.createElement('style');
            style.id = `${this.componentId}_styles`;
            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    // 移除组件CSS
    removeStyles() {
        const style = document.querySelector(`#${this.componentId}_styles`);
        if (style) {
            style.remove();
        }
    }

    // 基础接口
    render() { throw new Error('render方法必须被子类实现'); }
    show() { 
        if (this.element) {
            this.element.style.display = '';
            this.isVisible = true;
        }
    }
    hide() { 
        if (this.element) {
            this.element.style.display = 'none';
            this.isVisible = false;
        }
    }
    destroy() {
        if (this.element) {
            this.element.remove();
        }
        this.removeStyles();
        this.isVisible = false;
    }
}

/**
 * 头部组件
 */
PageComponents.Header = class extends BaseComponent {
    constructor(config = {}) {
        const defaultConfig = {
            container: 'body',
            title: '文件处理工具',
            navLinks: [
                {text: '首页', href: '/'}
            ],
            onNavClick: null
        };
        
        super({...defaultConfig, ...config});
    }

    static init(config) {
        const instance = new PageComponents.Header(config);
        instance.render();
        return instance;
    }

    render() {
        this.injectStyles(`
            .header-${this.componentId} {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 0;
            }
            
            .header-${this.componentId} .content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 16px;
            }
            
            .header-${this.componentId} .title {
                font-size: 1.5rem;
                font-weight: bold;
                margin: 0;
            }
            
            .header-${this.componentId} .nav-links {
                display: flex;
                gap: 24px;
            }
            
            .header-${this.componentId} .nav-link {
                color: rgba(255, 255, 255, 0.9);
                text-decoration: none;
                font-size: 0.95rem;
                transition: color 0.2s ease;
            }
            
            .header-${this.componentId} .nav-link:hover {
                color: white;
            }
        `);

        const navLinksHtml = this.config.navLinks.map(link => `
            <a href="${link.href}" class="nav-link" data-nav="${link.text}">${link.text}</a>
        `).join('');

        const html = `
            <header class="header-${this.componentId}">
                <div class="content">
                    <h1 class="title">${this.config.title}</h1>
                    <nav class="nav-links">
                        ${navLinksHtml}
                    </nav>
                </div>
            </header>
        `;

        const container = document.querySelector(this.config.container);
        if (container.tagName === 'BODY') {
            container.insertAdjacentHTML('afterbegin', html);
        } else {
            container.insertAdjacentHTML('beforeend', html);
        }
        
        this.element = container.querySelector(`.header-${this.componentId}`);
        this.bindEvents();
        return this;
    }

    bindEvents() {
        this.element.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink && this.config.onNavClick) {
                const navText = navLink.getAttribute('data-nav');
                const href = navLink.getAttribute('href');
                
                // 如果有回调函数，先调用回调，如果返回false则阻止默认跳转
                const result = this.config.onNavClick(navText, href);
                if (result === false) {
                    e.preventDefault();
                }
            }
        });
    }
};

/**
 * 文件选择器组件
 */
PageComponents.FileSelector = class extends BaseComponent {
    constructor(config = {}) {
        const defaultConfig = {
            container: 'body',
            title: '选择文件',
            subtitle: '支持拖拽上传或点击选择',
            buttonText: '选择文件',
            acceptTypes: ['*/*'],
            multiple: true,
            displayMode: 'card', // 'card' | 'list'
            showPreview: true,
            allowSorting: false,
            allowDelete: true,
            allowRename: false, // 新增：是否允许重命名
            maxFiles: Infinity, // 新增：最大文件数量限制
            // 新增：列表模式增强配置
            listMode: {
                style: 'default', // 'default' | 'enhanced' - 列表样式模式
                showCounter: false, // 是否显示文件计数器
                customActions: [], // 自定义动作按钮配置
                previewBackground: 'default', // 预览区背景样式：'default' | 'pattern'
                allowRotate: false, // 是否允许旋转（仅适用于图片）
                compactMode: false // 紧凑模式，减少间距
            },
            onFileClick: null,
            onFileSelect: null,
            onError: null,
            onFileRemove: null,
            onFileMove: null,
            onReset: null,
            onFileRotate: null // 新增：文件旋转回调
        };
        
        super({...defaultConfig, ...config});
        this.files = [];
        this.eventsBound = false; // 防止重复绑定事件
        this.fileOrder = []; // 文件排序数组
        this.fileRotations = new Map(); // 文件旋转角度映射 fileId -> rotation
    }

    static init(config) {
        const instance = new PageComponents.FileSelector(config);
        instance.render();
        return instance;
    }

    render() {
        this.injectStyles(`
            .file-selector-${this.componentId} {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 32px;
                background-color: #ffffff;
                border-radius: 16px;
                margin: 104px auto 32px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                text-align: center;
                transition: all 0.3s ease;
                border: 2px dashed rgba(102, 126, 234, 0.3);
                position: relative;
                cursor: pointer;
                overflow: hidden;
                flex-shrink: 0; /* 关键修复：防止组件在Flex容器中被压缩 */
            }
            
            .file-selector-${this.componentId}.hidden {
                display: none;
            }
            
            .file-selector-${this.componentId}:hover {
                background-color: rgba(102, 126, 234, 0.05);
                border-color: #667eea;
                transform: scale(1.02);
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
            }
            
            .file-selector-${this.componentId}.highlight {
                background-color: rgba(102, 126, 234, 0.05);
                border-color: #667eea;
                transform: scale(1.02);
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
            }
            
            .file-selector-${this.componentId} .simple-upload-title {
                font-size: 1.2rem;
                font-weight: 600;
                margin-bottom: 4px;
                color: #1b1b1b;
            }
            
            .file-selector-${this.componentId} .simple-upload-subtitle {
                font-size: 0.9rem;
                color: #717171;
                margin-bottom: 24px;
            }
            
            .file-selector-${this.componentId} .simple-upload-button {
                background-color: #667eea;
                color: white;
                border: none;
                padding: 16px 32px;
                border-radius: 16px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .file-selector-${this.componentId} .simple-upload-button:hover {
                background-color: #764ba2;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
            }
            
            .file-selector-${this.componentId} .simple-upload-button:active {
                transform: translateY(1px);
            }
            
            .file-selector-${this.componentId} .simple-upload-button svg {
                width: 20px;
                height: 20px;
            }
            
            .file-selector-${this.componentId} .file-input {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
                cursor: pointer;
                pointer-events: none; /* 禁用file-input的点击事件 */
            }

            /* 卡片模式文件展示样式 */
            .file-item-${this.componentId} {
                background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
                border-radius: 16px;
                margin: 104px auto 32px;
                padding: 32px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
                transition: all 0.3s ease;
                position: relative;
                width: 90%;
                max-width: 450px;
                text-align: center;
                border: 2px solid rgba(102, 126, 234, 0.1);
            }
            
            .file-item-${this.componentId}:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                border-color: rgba(102, 126, 234, 0.2);
            }
            
            .file-item-${this.componentId} .file-preview {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 24px;
                position: relative;
            }
            
            .file-item-${this.componentId} .file-icon {
                width: 80px;
                height: 80px;
                object-fit: contain;
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
                transition: transform 0.2s ease;
                cursor: default;
            }
            
            .file-item-${this.componentId}:hover .file-icon {
                transform: scale(1.05);
            }
            
            .file-item-${this.componentId} .file-info {
                margin-bottom: 24px;
            }
            
            .file-item-${this.componentId} .file-name {
                font-weight: 600;
                color: #1b1b1b;
                margin-bottom: 8px;
                word-break: break-all;
                line-height: 1.5;
                font-size: 1.1rem;
                max-height: 3em;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .file-item-${this.componentId} .file-size {
                color: #4f4f4f;
                font-size: 0.95rem;
                font-weight: 500;
                background-color: #f6f7fb;
                padding: 4px 16px;
                border-radius: 16px;
                display: inline-block;
            }
            
            .file-item-${this.componentId} .file-actions {
                display: flex;
                justify-content: center;
                margin-top: 24px;
            }
            
            .file-item-${this.componentId} .delete-btn {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                color: white;
                border: none;
                border-radius: 16px;
                padding: 8px 24px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 4px;
                box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            }
            
            .file-item-${this.componentId} .delete-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
                background: linear-gradient(135deg, #ff5757 0%, #e84545 100%);
            }
            
            .file-item-${this.componentId} .delete-btn:active {
                transform: translateY(0);
            }
            
            /* 重命名按钮样式 */
            .file-item-${this.componentId} .rename-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 16px;
                padding: 8px 24px;
                font-size: 0.9rem;
                font-weight: 500;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                margin-right: 8px;
            }
            
            .file-item-${this.componentId} .rename-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                background: linear-gradient(135deg, #5a6fd8 0%, #6a4590 100%);
            }
            
            .file-item-${this.componentId} .rename-btn:active {
                transform: translateY(0);
            }
            
            /* 重命名输入框样式 */
            .file-item-${this.componentId} .rename-input {
                width: 100%;
                padding: 8px 12px;
                border: 2px solid #667eea;
                border-radius: 8px;
                font-size: 1rem;
                margin-bottom: 12px;
                display: none;
            }
            
            .file-item-${this.componentId} .rename-input.active {
                display: block;
            }
            
            .file-item-${this.componentId} .rename-actions {
                display: none;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .file-item-${this.componentId} .rename-actions.active {
                display: flex;
            }
            
            .file-item-${this.componentId} .rename-confirm,
            .file-item-${this.componentId} .rename-cancel {
                padding: 8px 20px;
                border-radius: 16px;
                border: none;
                font-size: 0.85rem;
                font-weight: 500;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .file-item-${this.componentId} .rename-confirm {
                background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
                color: white;
            }
            
            .file-item-${this.componentId} .rename-confirm:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
                background: linear-gradient(135deg, #45a049 0%, #388e3c 100%);
            }
            
            .file-item-${this.componentId} .rename-confirm:active {
                transform: translateY(0);
            }
            
            .file-item-${this.componentId} .rename-cancel {
                background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
                color: #666;
            }
            
            .file-item-${this.componentId} .rename-cancel:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                background: linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%);
            }
            
            .file-item-${this.componentId} .rename-cancel:active {
                transform: translateY(0);
            }

            /* 列表模式样式 */
            .files-list-container-${this.componentId} {
                max-width: 500px;
                margin: 0 auto;
                width: 100%;
                padding: 16px;
                padding-bottom: 100px; /* 为底部导出按钮留出空间 */
            }

            /* 列表模式计数器样式 */
            .files-counter-${this.componentId} {
                padding: 8px 16px;
                margin-bottom: 16px;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                text-align: center;
                max-width: 500px;
                margin-left: auto;
                margin-right: auto;
                width: 100%;
                position: relative;
                z-index: 1; /* 确保计数器在导出按钮之上 */
            }

            .files-counter-${this.componentId} .counter-text {
                font-size: 16px;
                color: #1b1b1b;
            }

            .files-counter-${this.componentId} .counter-number {
                color: #667eea;
                font-weight: bold;
            }

            .file-list-item-${this.componentId} {
                display: flex;
                background: #ffffff;
                border-radius: 12px;
                margin-bottom: 16px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                height: 120px;
                min-height: 120px;
                width: 100%;
                border: 2px solid transparent;
                cursor: grab;
            }

            .file-list-item-${this.componentId}:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
                border-color: rgba(102, 126, 234, 0.3);
            }

            .file-list-item-${this.componentId}.dragging {
                opacity: 0.5;
                transform: scale(1.05);
                cursor: grabbing;
            }

            .file-list-item-${this.componentId} .file-number {
                width: 28px;
                height: 28px;
                background-color: #667eea;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 0.8rem;
                font-weight: 600;
                position: absolute;
                border-radius: 6px;
                top: 8px;
                left: 8px;
                z-index: 10;
            }

            .file-list-item-${this.componentId} .file-preview-area {
                width: 100px;
                min-width: 100px;
                height: 100px;
                background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
                margin: 10px;
                align-self: center;
                border-radius: 6px;
            }

            /* 增强模式的预览区域 */
            .file-list-item-${this.componentId}.enhanced .file-preview-area {
                background-color: #f0f0f0;
                background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 5px, transparent 5px, transparent 10px);
            }

            .file-list-item-${this.componentId}.enhanced .file-preview-container {
                background: transparent;
                box-shadow: none;
            }

            .file-list-item-${this.componentId}.enhanced .file-preview-container img {
                max-width: 85%;
                max-height: 85%;
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                transform-origin: center;
                cursor: default;
            }

            .file-list-item-${this.componentId} .file-preview-container {
                width: 85%;
                height: 90%;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .file-list-item-${this.componentId} .file-preview-container img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                border-radius: 6px;
                cursor: default;
            }

            .file-list-item-${this.componentId} .file-info-area {
                flex: 1;
                padding: 12px 6px 12px 0px;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                min-width: 0;
                max-height: 100%;
                overflow: hidden;
            }

            .file-list-item-${this.componentId} .file-name-display {
                font-size: 0.9rem;
                font-weight: 500;
                margin-bottom: 4px;
                color: #1b1b1b;
                padding-bottom: 8px;
                line-height: 1.3;
                word-break: break-word;
                overflow-wrap: break-word;
                max-height: 2.6em; /* 允许显示2行文本 */
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }

            .file-list-item-${this.componentId} .file-size-display {
                font-size: 0.75rem;
                color: #717171;
                margin-bottom: 8px;
                flex-shrink: 0;
            }

            .file-list-item-${this.componentId} .file-actions-area {
                display: flex;
                justify-content: space-between;
                flex-wrap: nowrap;
                gap: 2px;
                margin-top: auto;
                width: 100%;
                max-width: 100%;
                padding-bottom: 4px;
                margin-bottom: 4px;
                flex-shrink: 0;
            }

            .file-list-item-${this.componentId} .action-btn {
                padding: 3px 4px;
                border: none;
                background-color: rgba(0,0,0,0.04);
                border-radius: 6px;
                font-size: 0.85rem;
                color: #4f4f4f;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 1px;
                white-space: nowrap;
                flex: 1;
                min-width: 0;
                justify-content: center;
                text-align: center;
                margin: 0 2px;
            }

            .file-list-item-${this.componentId} .action-btn:hover {
                background-color: rgba(0,0,0,0.08);
                color: #1b1b1b;
            }

            .file-list-item-${this.componentId} .action-btn svg {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
            }

            .file-list-item-${this.componentId} .delete-btn-top {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 32px;
                height: 32px;
                background: rgba(255, 71, 87, 0.9);
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                font-size: 1rem;
                font-weight: bold;
                transition: all 0.2s ease;
                backdrop-filter: blur(4px);
            }

            .file-list-item-${this.componentId} .delete-btn-top:hover {
                background: rgba(255, 71, 87, 1);
                transform: scale(1.1);
            }
            
            /* 列表模式重命名样式 */
            .file-list-item-${this.componentId} .rename-input-list {
                width: 100%;
                padding: 6px 10px;
                border: 2px solid #667eea;
                border-radius: 6px;
                font-size: 0.9rem;
                margin-bottom: 8px;
                display: none;
            }
            
            .file-list-item-${this.componentId} .rename-input-list.active {
                display: block;
            }
            
            .file-list-item-${this.componentId} .rename-actions-list {
                display: none;
                gap: 6px;
                margin-bottom: 8px;
            }
            
            .file-list-item-${this.componentId} .rename-actions-list.active {
                display: flex;
            }
            
            /* 列表模式确认取消按钮样式 - 与action-btn保持一致 */
            .file-list-item-${this.componentId} .rename-confirm,
            .file-list-item-${this.componentId} .rename-cancel {
                padding: 3px 8px;
                border: none;
                border-radius: 6px;
                font-size: 0.85rem;
                color: #4f4f4f;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 2px;
            }
            
            .file-list-item-${this.componentId} .rename-confirm {
                background-color: #4caf50;
                color: white;
            }
            
            .file-list-item-${this.componentId} .rename-confirm:hover {
                background-color: #45a049;
                transform: translateY(-1px);
            }
            
            .file-list-item-${this.componentId} .rename-confirm:active {
                transform: translateY(0);
            }
            
            .file-list-item-${this.componentId} .rename-cancel {
                background-color: rgba(0,0,0,0.04);
                color: #666;
            }
            
            .file-list-item-${this.componentId} .rename-cancel:hover {
                background-color: rgba(0,0,0,0.08);
            }
            
            .file-list-item-${this.componentId} .rename-cancel:active {
                background-color: rgba(0,0,0,0.12);
            }

            /* 移动端适配 */
            @media screen and (max-width: 767px) {
                .files-list-container-${this.componentId} {
                    padding: 12px;
                    padding-bottom: 120px; /* 移动端给更多空间 */
                }
                
                .files-counter-${this.componentId} {
                    padding: 6px 12px;
                    margin-bottom: 12px;
                    font-size: 14px;
                }
                
                .file-list-item-${this.componentId} {
                    height: 100px;
                    min-height: 100px;
                    margin-bottom: 12px;
                }
                
                .file-list-item-${this.componentId} .file-preview-area {
                    width: 80px;
                    min-width: 80px;
                    height: 80px;
                    margin: 10px 8px;
                }
                
                .file-list-item-${this.componentId} .file-info-area {
                    padding: 10px 4px 10px 0px;
                }
                
                .file-list-item-${this.componentId} .file-name-display {
                    font-size: 0.85rem;
                    padding-bottom: 6px;
                    max-height: 2.4em; /* 移动端稍微紧凑一些 */
                    line-height: 1.2;
                }
                
                .file-list-item-${this.componentId} .file-size-display {
                    font-size: 0.7rem;
                    margin-bottom: 6px;
                }
                
                .file-list-item-${this.componentId} .action-btn {
                    padding: 2px 3px;
                    font-size: 0.8rem;
                    margin: 0 1px;
                }
                
                .file-list-item-${this.componentId} .action-btn svg {
                    width: 14px;
                    height: 14px;
                }
                
                .file-list-item-${this.componentId} .rename-confirm,
                .file-list-item-${this.componentId} .rename-cancel {
                    padding: 2px 6px;
                    font-size: 0.8rem;
                }
                
                .file-list-item-${this.componentId} .file-number {
                    width: 24px;
                    height: 24px;
                    font-size: 0.75rem;
                    top: 6px;
                    left: 6px;
                }
                
                .file-list-item-${this.componentId} .delete-btn-top {
                    width: 28px;
                    height: 28px;
                    top: 6px;
                    right: 6px;
                    font-size: 0.9rem;
                }
            }
        `);

        const html = `
            <div class="file-selector-${this.componentId}">
                <div class="simple-upload-title">${this.config.title}</div>
                <div class="simple-upload-subtitle">${this.config.subtitle}</div>
                <div class="simple-upload-button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    ${this.config.buttonText}
                </div>
                <input type="file" class="file-input" accept="${this.config.acceptTypes.join(',')}" ${this.config.multiple ? 'multiple' : ''}>
            </div>
        `;

        const container = document.querySelector(this.config.container);
        container.insertAdjacentHTML('beforeend', html);
        this.element = container.querySelector(`.file-selector-${this.componentId}`);
        
        this.bindEvents();
        this.bindDeleteEvents(); // 立即绑定删除事件
        this.bindRenameEvents(); // 绑定重命名事件
        return this;
    }

    bindEvents() {
        const fileInput = this.element.querySelector('.file-input');
        const container = this.element;

        // 文件选择事件
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // 拖拽事件
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            container.addEventListener(eventName, () => container.classList.add('highlight'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, () => container.classList.remove('highlight'), false);
        });

        container.addEventListener('drop', (e) => {
            this.handleFileSelect(e.dataTransfer.files);
        }, false);

        // 点击事件
        container.addEventListener('click', (e) => {
            // 如果是程序触发的点击，跳过处理
            if (this.isProgrammaticClick) {
                return;
            }
            
            if (this.config.onFileClick) {
                this.config.onFileClick();
            }else {
                // if (e.target.matches('input[type="file"]')) {
                fileInput.click();
                // }
            }
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async handleFileSelect(files) {
        let filesArray = Array.from(files);
        
        // 清理文件输入状态，允许重复选择同一文件
        const fileInput = this.element.querySelector('.file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        
        if (filesArray.length > 0) {
            // 检查是否超过最大文件数量限制
            const totalFiles = this.config.displayMode === 'list' ? this.files.length + filesArray.length : filesArray.length;
            
            if (totalFiles > this.config.maxFiles) {
                // 如果超过限制，显示错误提示
                const message = "最多只能选择 "+this.config.maxFiles+" 个文件，您已选择 "+totalFiles+" 个文件，超过部分无法添加!";
                if (typeof $ShowCast !== 'undefined') {
                    await $ShowCast.confirm({
                        "title": "提示",
                        "message": message,
                        "confirmText": "确认",
                    });
                } else {
                    alert(message);
                }
                
                // 如果是列表模式，保留已有文件
                if (this.config.displayMode === 'list') {
                    // 只添加不超过限制的文件数量
                    const remainingSlots = this.config.maxFiles - this.files.length;
                    if (remainingSlots >= 0) {
                        filesArray = filesArray.slice(0, remainingSlots);
                        console.log('filesArray', filesArray);
                    }
                }
            }
            
            // 在列表模式下，添加文件到现有列表
            if (this.config.displayMode === 'list' && this.files.length > 0) {
                const newFiles = filesArray.map((file, index) => ({
                    id: `file_${Date.now()}_${this.files.length + index}`,
                    file: file,
                    preview: null
                }));
                this.files = [...this.files, ...newFiles];
            } else {
                // 存储文件到组件实例
                this.files = filesArray.map((file, index) => ({
                    id: `file_${Date.now()}_${index}`,
                    file: file,
                    preview: null
                }));
                this.showFiles();
            }
            
            // 更新文件顺序
            this.fileOrder = this.files.map(f => f.id);
        } else {
            // 处理空文件数组的情况
            this.files = [];
            this.fileOrder = [];
            this.checkAndHandleEmptyFiles();
        }

        if (this.config.onFileSelect) {
            this.config.onFileSelect(filesArray);
        }
    }

    getFileInput(){
        return this.element.querySelector('.file-input');
    }

    showFiles() {
        if (this.config.displayMode === 'list') {
            this.showFilesList();
        } else {
            this.showFilesCards();
        }
    }

    showFilesCards() {
        // 隐藏文件选择器
        this.hide();
        
        // 显示文件项
        const container = document.querySelector(this.config.container);
        this.files.forEach(fileData => {
            const fileItem = document.createElement('div');
            fileItem.className = `file-item-${this.componentId}`;
            fileItem.setAttribute('data-id', fileData.id);
            
            const iconSrc = this.getFileIcon(fileData.file.name);
            const displayImg = fileData.preview || iconSrc;
            
            fileItem.innerHTML = `
                <div class="file-preview">
                    <img src="${displayImg}" alt="文件预览" class="file-icon">
                </div>
                <div class="file-info">
                    <input type="text" class="rename-input" data-file-id="${fileData.id}" value="${fileData.file.name}" />
                    <div class="rename-actions" data-file-id="${fileData.id}">
                        <button class="rename-confirm" data-file-id="${fileData.id}">确认</button>
                        <button class="rename-cancel" data-file-id="${fileData.id}">取消</button>
                    </div>
                    <div class="file-name" data-file-id="${fileData.id}">${fileData.file.name}</div>
                    <div class="file-size">${this.formatFileSize(fileData.file.size)}</div>
                </div>
                ${this.config.allowRename ? `
                <div class="file-actions">
                    <button class="rename-btn" data-file-id="${fileData.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        重命名
                    </button>
                </div>
                ` : ''}
                ${this.config.allowDelete ? `
                <div class="file-actions">
                    <button class="delete-btn" data-file-id="${fileData.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        删除
                    </button>
                </div>
                ` : ''}
            `;
            
            container.appendChild(fileItem);
        });
        
        // 确保事件已绑定
        this.bindDeleteEvents();
        
        // 将组件实例暴露到全局，用于内联事件处理
        window[`component_${this.componentId}`] = this;
    }

    showFilesList() {
        // 隐藏文件选择器
        this.hide();
        
        const container = document.querySelector(this.config.container);
        
        // 创建计数器（如果启用）
        if (this.config.listMode.showCounter) {
            let counterContainer = container.querySelector(`.files-counter-${this.componentId}`);
            if (!counterContainer) {
                counterContainer = document.createElement('div');
                counterContainer.className = `files-counter-${this.componentId}`;
                container.appendChild(counterContainer);
            }
            counterContainer.innerHTML = `
                <div class="counter-text">已添加 <span class="counter-number">${this.files.length}</span> 个文档</div>
            `;
        }
        
        // 创建文件列表容器
        let listContainer = container.querySelector(`.files-list-container-${this.componentId}`);
        if (!listContainer) {
            listContainer = document.createElement('div');
            listContainer.className = `files-list-container-${this.componentId}`;
            container.appendChild(listContainer);
        }
        
        // 清空并重新渲染
        listContainer.innerHTML = '';
        
        // 按照fileOrder顺序显示文件
        const orderedFiles = this.fileOrder.map(id => this.files.find(f => f.id === id)).filter(Boolean);
        
        orderedFiles.forEach((fileData, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = `file-list-item-${this.componentId}`;
            
            // 添加增强模式的CSS类
            if (this.config.listMode.style === 'enhanced') {
                fileItem.classList.add('enhanced');
            }
            
            fileItem.setAttribute('data-id', fileData.id);
            fileItem.setAttribute('data-index', index);
            
            const displayName = fileData.file.originalFile ? fileData.file.originalFile.name : fileData.file.name;
            const displaySize = fileData.file.originalFile ? fileData.file.originalFile.size : fileData.file.size;
            const previewSrc = fileData.preview || this.getFileIcon(fileData.file.name);
            
            // 获取旋转角度
            const rotation = this.fileRotations.get(fileData.id) || 0;
            
            // 构建动作按钮
            let actionsHTML = '';
            
            // 移动按钮
            if (this.config.allowSorting) {
                actionsHTML += `
                    <button class="action-btn move-up" onclick="component_${this.componentId}.moveFile('${fileData.id}', 'up')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                        </svg>
                        上移
                    </button>
                    <button class="action-btn move-down" onclick="component_${this.componentId}.moveFile('${fileData.id}', 'down')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                        </svg>
                        下移
                    </button>
                `;
            }
            
            // 重命名按钮
            if (this.config.allowRename) {
                actionsHTML += `
                    <button class="action-btn rename" onclick="component_${this.componentId}.startRenameListItem('${fileData.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        重命名
                    </button>
                `;
            }
            
            // 旋转按钮（仅在允许旋转时显示）
            if (this.config.listMode.allowRotate && this.isImageFile(fileData.file)) {
                actionsHTML += `
                    <button class="action-btn rotate" onclick="component_${this.componentId}.rotateFile('${fileData.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/>
                        </svg>
                        旋转
                    </button>
                `;
            }
            
            // 自定义动作按钮
            if (this.config.listMode.customActions && this.config.listMode.customActions.length > 0) {
                this.config.listMode.customActions.forEach(action => {
                    actionsHTML += `
                        <button class="action-btn ${action.className || ''}" onclick="component_${this.componentId}.handleCustomAction('${fileData.id}', '${action.action}')">
                            ${action.icon || ''}
                            ${action.text || ''}
                        </button>
                    `;
                });
            }
            
            // 删除按钮
            if (this.config.allowDelete) {
                actionsHTML += `
                    <button class="action-btn delete" onclick="component_${this.componentId}.removeFile('${fileData.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        删除
                    </button>
                `;
            }
            
            fileItem.innerHTML = `
                <div class="file-number">${index + 1}</div>
                <div class="file-preview-area">
                    <div class="file-preview-container">
                        <img src="${previewSrc}" alt="文件预览" style="transform: rotate(${rotation}deg);">
                    </div>
                </div>
                <div class="file-info-area">
                    <input type="text" class="rename-input-list" data-file-id="${fileData.id}" value="${displayName}" />
                    <div class="rename-actions-list" data-file-id="${fileData.id}">
                        <button class="rename-confirm" data-file-id="${fileData.id}">确认</button>
                        <button class="rename-cancel" data-file-id="${fileData.id}">取消</button>
                    </div>
                    <div class="file-name-display" data-file-id="${fileData.id}" title="${displayName}">${displayName}</div>
                    <div class="file-size-display">${this.formatFileSize(displaySize)}</div>
                    <div class="file-actions-area">
                        ${actionsHTML}
                    </div>
                </div>
            `;
            
            listContainer.appendChild(fileItem);
        });
        
        // 确保事件已绑定
        this.bindDeleteEvents();
        
        // 将组件实例暴露到全局，用于内联事件处理
        window[`component_${this.componentId}`] = this;
    }

    // 旋转文件
    rotateFile(fileId) {
        const currentRotation = this.fileRotations.get(fileId) || 0;
        const newRotation = (currentRotation + 90) % 360;
        this.fileRotations.set(fileId, newRotation);
        
        // 重新渲染列表以更新旋转显示
        if (this.config.displayMode === 'list') {
            this.showFilesList();
        }
        
        // 触发旋转回调
        if (this.config.onFileRotate) {
            this.config.onFileRotate(fileId, newRotation);
        }
    }

    // 处理自定义动作
    handleCustomAction(fileId, action) {
        const fileData = this.files.find(f => f.id === fileId);
        if (!fileData) return;
        
        const actionConfig = this.config.listMode.customActions.find(a => a.action === action);
        if (actionConfig && actionConfig.handler) {
            actionConfig.handler(fileId, fileData, action);
        }
    }

    // 检查是否为图片文件
    isImageFile(file) {
        return file.type && file.type.startsWith('image/');
    }

    // 获取文件旋转角度
    getFileRotation(fileId) {
        return this.fileRotations.get(fileId) || 0;
    }

    // 设置文件旋转角度
    setFileRotation(fileId, rotation) {
        this.fileRotations.set(fileId, rotation);
        
        // 重新渲染列表以更新旋转显示
        if (this.config.displayMode === 'list') {
            this.showFilesList();
        }
    }

    // 移动文件
    moveFile(fileId, direction) {
        const currentIndex = this.fileOrder.indexOf(fileId);
        if (currentIndex === -1) return;
        
        let newIndex = currentIndex;
        if (direction === 'up' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < this.fileOrder.length - 1) {
            newIndex = currentIndex + 1;
        } else {
            return; // 无法移动
        }
        
        // 交换位置
        [this.fileOrder[currentIndex], this.fileOrder[newIndex]] = [this.fileOrder[newIndex], this.fileOrder[currentIndex]];
        
        // 重新渲染列表
        this.showFilesList();
        
        // 触发回调
        if (this.config.onFileMove) {
            this.config.onFileMove(fileId, direction, this.getOrderedFiles());
        }
    }



    // 获取按顺序排列的文件
    getOrderedFiles() {
        return this.fileOrder.map(id => this.files.find(f => f.id === id)).filter(Boolean);
    }



    updateFileObject(fileId, newFile) {
        const fileData = this.files.find(f => f.id === fileId);
        if (fileData) {
            fileData.file = newFile;
        }
    }

    bindDeleteEvents() {
        if (this.eventsBound) return; // 防止重复绑定
        
        const container = document.querySelector(this.config.container);
        container.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn, .delete-btn-top');
            if (deleteBtn && deleteBtn.getAttribute('data-file-id')) {
                const fileId = deleteBtn.getAttribute('data-file-id');
                this.removeFile(fileId);
            }
        });
        
        this.eventsBound = true;
    }
    
    bindRenameEvents() {
        // 防止重复绑定
        if (this.renameEventsBound) return;
        
        const container = document.querySelector(this.config.container);
        container.addEventListener('click', (e) => {
            // 重命名按钮点击
            const renameBtn = e.target.closest('.rename-btn');
            if (renameBtn && renameBtn.getAttribute('data-file-id')) {
                const fileId = renameBtn.getAttribute('data-file-id');
                this.startRename(fileId);
            }
            
            // 确认重命名
            const confirmBtn = e.target.closest('.rename-confirm');
            if (confirmBtn && confirmBtn.getAttribute('data-file-id')) {
                const fileId = confirmBtn.getAttribute('data-file-id');
                this.confirmRename(fileId);
            }
            
            // 取消重命名
            const cancelBtn = e.target.closest('.rename-cancel');
            if (cancelBtn && cancelBtn.getAttribute('data-file-id')) {
                const fileId = cancelBtn.getAttribute('data-file-id');
                this.cancelRename(fileId);
            }
        });
        
        // 绑定输入框回车事件
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const input = e.target.closest('.rename-input, .rename-input-list');
                if (input && input.getAttribute('data-file-id')) {
                    const fileId = input.getAttribute('data-file-id');
                    this.confirmRename(fileId);
                }
            } else if (e.key === 'Escape') {
                const input = e.target.closest('.rename-input, .rename-input-list');
                if (input && input.getAttribute('data-file-id')) {
                    const fileId = input.getAttribute('data-file-id');
                    this.cancelRename(fileId);
                }
            }
        });
        
        this.renameEventsBound = true;
    }

    removeFile(fileId) {
        // 移除文件数据
        this.files = this.files.filter(file => file.id !== fileId);
        this.fileOrder = this.fileOrder.filter(id => id !== fileId);
        
        // 清理旋转状态
        this.fileRotations.delete(fileId);
        
        // 移除文件DOM元素
        const fileItem = document.querySelector(`[data-id="${fileId}"]`);
        if (fileItem) {
            fileItem.remove();
        }
        
        // 触发移除回调
        if (this.config.onFileRemove) {
            this.config.onFileRemove(fileId, this.getOrderedFiles());
        }
        
        // 检查并处理文件数量为0的情况
        this.checkAndHandleEmptyFiles();
    }
    
    startRename(fileId) {
        const container = document.querySelector(this.config.container);
        const fileItem = container.querySelector(`[data-file-id="${fileId}"]`).closest('.file-item-' + this.componentId);
        
        if (fileItem) {
            const fileName = fileItem.querySelector(`.file-name[data-file-id="${fileId}"]`);
            const renameInput = fileItem.querySelector(`.rename-input[data-file-id="${fileId}"]`);
            const renameActions = fileItem.querySelector(`.rename-actions[data-file-id="${fileId}"]`);
            
            if (fileName && renameInput && renameActions) {
                // 获取文件数据
                const fileData = this.files.find(f => f.id === fileId);
                if (fileData) {
                    // 获取文件名（不含扩展名）
                    const fullName = fileData.file.name;
                    const lastDotIndex = fullName.lastIndexOf('.');
                    const nameWithoutExt = lastDotIndex > -1 ? fullName.substring(0, lastDotIndex) : fullName;
                    
                    // 设置输入框值为不含扩展名的文件名
                    renameInput.value = nameWithoutExt;
                }
                
                fileName.style.display = 'none';
                renameInput.classList.add('active');
                renameActions.classList.add('active');
                renameInput.focus();
                renameInput.select();
            }
        }
    }
    
    startRenameListItem(fileId) {
        const container = document.querySelector(this.config.container);
        const fileItem = container.querySelector(`[data-file-id="${fileId}"]`).closest('.file-list-item-' + this.componentId);
        
        if (fileItem) {
            const fileName = fileItem.querySelector(`.file-name-display[data-file-id="${fileId}"]`);
            const renameInput = fileItem.querySelector(`.rename-input-list[data-file-id="${fileId}"]`);
            const renameActions = fileItem.querySelector(`.rename-actions-list[data-file-id="${fileId}"]`);
            
            if (fileName && renameInput && renameActions) {
                // 获取文件数据
                const fileData = this.files.find(f => f.id === fileId);
                if (fileData) {
                    // 获取文件名（不含扩展名）
                    const fullName = fileData.file.name;
                    const lastDotIndex = fullName.lastIndexOf('.');
                    const nameWithoutExt = lastDotIndex > -1 ? fullName.substring(0, lastDotIndex) : fullName;
                    
                    // 设置输入框值为不含扩展名的文件名
                    renameInput.value = nameWithoutExt;
                }
                
                fileName.style.display = 'none';
                renameInput.classList.add('active');
                renameActions.classList.add('active');
                renameInput.focus();
                renameInput.select();
            }
        }
    }
    
    confirmRename(fileId) {
        const container = document.querySelector(this.config.container);
        const renameInput = container.querySelector(`.rename-input[data-file-id="${fileId}"], .rename-input-list[data-file-id="${fileId}"]`);
        
        if (renameInput) {
            const newName = renameInput.value.trim();
            if (newName && newName !== '') {
                this.renameFile(fileId, newName);
            }
            this.cancelRename(fileId);
        }
    }
    
    cancelRename(fileId) {
        const container = document.querySelector(this.config.container);
        
        // 处理卡片模式
        const fileItem = container.querySelector(`[data-file-id="${fileId}"]`).closest('.file-item-' + this.componentId);
        if (fileItem) {
            const fileName = fileItem.querySelector(`.file-name[data-file-id="${fileId}"]`);
            const renameInput = fileItem.querySelector(`.rename-input[data-file-id="${fileId}"]`);
            const renameActions = fileItem.querySelector(`.rename-actions[data-file-id="${fileId}"]`);
            
            if (fileName && renameInput && renameActions) {
                fileName.style.display = 'block';
                renameInput.classList.remove('active');
                renameActions.classList.remove('active');
                
                // 恢复原始文件名
                const fileData = this.files.find(f => f.id === fileId);
                if (fileData) {
                    renameInput.value = fileData.file.name;
                }
            }
        }
        
        // 处理列表模式
        const listItem = container.querySelector(`[data-file-id="${fileId}"]`).closest('.file-list-item-' + this.componentId);
        if (listItem) {
            const fileName = listItem.querySelector(`.file-name-display[data-file-id="${fileId}"]`);
            const renameInput = listItem.querySelector(`.rename-input-list[data-file-id="${fileId}"]`);
            const renameActions = listItem.querySelector(`.rename-actions-list[data-file-id="${fileId}"]`);
            
            if (fileName && renameInput && renameActions) {
                fileName.style.display = 'block';
                renameInput.classList.remove('active');
                renameActions.classList.remove('active');
                
                // 恢复原始文件名
                const fileData = this.files.find(f => f.id === fileId);
                if (fileData) {
                    renameInput.value = fileData.file.name;
                }
            }
        }
    }
    
    renameFile(fileId, newName) {
        const fileData = this.files.find(f => f.id === fileId);
        if (fileData) {
            // 获取文件扩展名
            const lastDotIndex = fileData.file.name.lastIndexOf('.');
            let extension = '';
            if (lastDotIndex > -1) {
                extension = fileData.file.name.substring(lastDotIndex);
            }
            
            // 如果新名称没有扩展名，添加原有的扩展名
            if (extension && !newName.endsWith(extension)) {
                newName = newName + extension;
            }
            
            // 创建新的File对象
            const newFile = new File([fileData.file], newName, {
                type: fileData.file.type,
                lastModified: fileData.file.lastModified
            });
            
            // 更新文件数据
            fileData.file = newFile;
            
            // 更新DOM显示
            const container = document.querySelector(this.config.container);
            
            // 更新卡片模式的文件名显示
            const cardFileName = container.querySelector(`.file-name[data-file-id="${fileId}"]`);
            if (cardFileName) {
                cardFileName.textContent = newName;
            }
            
            // 更新列表模式的文件名显示
            const listFileName = container.querySelector(`.file-name-display[data-file-id="${fileId}"]`);
            if (listFileName) {
                listFileName.textContent = newName;
                listFileName.title = newName;
            }
            
            // 触发文件变化事件
            if (this.config.onFileSelect) {
                this.config.onFileSelect(this.files.map(f => f.file));
            }
        }
    }

    // 新增方法：检查并处理文件数量为0的情况
    checkAndHandleEmptyFiles() {
        if (this.files.length === 0) {
            // 清理列表容器
            const listContainer = document.querySelector(`.files-list-container-${this.componentId}`);
            if (listContainer) {
                listContainer.remove();
            }
            
            // 清理计数器
            const counterContainer = document.querySelector(`.files-counter-${this.componentId}`);
            if (counterContainer) {
                counterContainer.remove();
            }
            
            // 清空input值，确保可以重新选择相同文件
            const fileInput = this.element.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.value = '';
            }
            
            // 重新显示选择器
            this.show();
            
            // 触发文件变更回调，让页面处理状态重置
            if (this.config.onFileSelect) {
                this.config.onFileSelect([]);
            }
            
            // 如果有配置的重置回调，也调用它
            if (this.config.onReset) {
                this.config.onReset();
            }
        } else if (this.config.displayMode === 'list') {
            // 如果还有文件，重新渲染列表以更新序号
            this.showFilesList();
        }
    }

    getComposedFileName() {
        let fileName = this.files.map(file => file.file.name).join('+');
        // 去除空格，把点替换成下划线，去除不可见字符，去除换行符
        fileName = fileName.replace(/\s+/g, '').replace(/\./g, '_').replace(/[\x00-\x1F\x7F]/g, '').replace(/\n/g, '');
        return fileName;
    }

    getFileIcon(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        return this.generateFileIconSVG(extension);
    }

    generateFileIconSVG(extension) {
        const fileTypes = {
            // 文档类
            'pdf': { color: '#E53E3E', name: 'PDF', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'doc': { color: '#2563EB', name: 'DOC', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'docx': { color: '#2563EB', name: 'DOCX', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'txt': { color: '#64748B', name: 'TXT', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'rtf': { color: '#7C3AED', name: 'RTF', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            
            // 表格类
            'xls': { color: '#059669', name: 'XLS', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'xlsx': { color: '#059669', name: 'XLSX', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'csv': { color: '#10B981', name: 'CSV', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            
            // 演示文稿类
            'ppt': { color: '#DC2626', name: 'PPT', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'pptx': { color: '#DC2626', name: 'PPTX', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            
            // 图片类
            'jpg': { color: '#7C3AED', name: 'JPG', icon: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
            'jpeg': { color: '#7C3AED', name: 'JPEG', icon: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
            'png': { color: '#06B6D4', name: 'PNG', icon: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
            'gif': { color: '#EC4899', name: 'GIF', icon: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
            'svg': { color: '#F59E0B', name: 'SVG', icon: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
            'webp': { color: '#8B5CF6', name: 'WEBP', icon: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
            'bmp': { color: '#84CC16', name: 'BMP', icon: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
            'ico': { color: '#6366F1', name: 'ICO', icon: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
            
            // 音频类
            'mp3': { color: '#F59E0B', name: 'MP3', icon: 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z' },
            'wav': { color: '#3B82F6', name: 'WAV', icon: 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z' },
            'flac': { color: '#7C3AED', name: 'FLAC', icon: 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z' },
            'aac': { color: '#10B981', name: 'AAC', icon: 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z' },
            
            // 视频类
            'mp4': { color: '#DC2626', name: 'MP4', icon: 'M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z' },
            'avi': { color: '#7C3AED', name: 'AVI', icon: 'M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z' },
            'mov': { color: '#059669', name: 'MOV', icon: 'M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z' },
            'wmv': { color: '#2563EB', name: 'WMV', icon: 'M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z' },
            'mkv': { color: '#7C2D12', name: 'MKV', icon: 'M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z' },
            
            // 压缩文件类
            'zip': { color: '#F59E0B', name: 'ZIP', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'rar': { color: '#DC2626', name: 'RAR', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            '7z': { color: '#7C3AED', name: '7Z', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'tar': { color: '#059669', name: 'TAR', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            'gz': { color: '#0891B2', name: 'GZ', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' },
            
            // 代码类
            'js': { color: '#F7DF1E', name: 'JS', icon: 'M3,3H21V21H3V3M7.73,18.04C8.13,18.89 8.92,19.59 10.27,19.59C11.77,19.59 12.8,18.79 12.8,17.04V11.26H11.1V17C11.1,17.86 10.75,18.08 10.2,18.08C9.62,18.08 9.38,17.68 9.11,17.21L7.73,18.04M13.71,17.86C14.21,18.84 15.22,19.59 16.8,19.59C18.4,19.59 19.6,18.76 19.6,17.23C19.6,15.82 18.79,15.19 17.35,14.57L16.93,14.39C16.2,14.08 15.89,13.87 15.89,13.37C15.89,12.96 16.2,12.64 16.7,12.64C17.18,12.64 17.5,12.85 17.79,13.37L19.1,12.5C18.55,11.54 17.77,11.17 16.7,11.17C15.19,11.17 14.22,12.13 14.22,13.4C14.22,14.78 15.03,15.43 16.25,15.95L16.67,16.13C17.45,16.47 17.91,16.68 17.91,17.26C17.91,17.74 17.46,18.09 16.76,18.09C15.93,18.09 15.45,17.66 15.09,17.06L13.71,17.86Z' },
            'html': { color: '#E34F26', name: 'HTML', icon: 'M12,17.56L16.07,16.43L16.62,10.33H9.38L9.2,8.3H16.8L17,6.31H7L7.56,12.32H14.45L14.22,14.9L12,15.5L9.78,14.9L9.64,13.24H7.64L7.93,16.43L12,17.56M4.07,3H19.93L18.5,19.2L12,21L5.5,19.2L4.07,3Z' },
            'css': { color: '#1572B6', name: 'CSS', icon: 'M5,3L4.35,6.34H17.94L17.5,8.5H3.92L3.26,11.83H16.85L16.09,15.64L10.61,17.45L5.86,15.64L6.19,14H2.85L2.06,18L9.91,21L18.96,18L20.16,11.97L20.4,10.76L21.94,3H5Z' },
            'json': { color: '#000000', name: 'JSON', icon: 'M5,3H7V5H5V10A2,2 0 0,1 3,12A2,2 0 0,1 5,14V19H7V21H5C3.93,20.73 3,20.1 3,19V15A2,2 0 0,0 1,13H0V11H1A2,2 0 0,0 3,9V5A2,2 0 0,1 5,3M19,3A2,2 0 0,1 21,5V9A2,2 0 0,0 23,11H24V13H23A2,2 0 0,0 21,15V19A2,2 0 0,1 19,21H17V19H19V14A2,2 0 0,1 21,12A2,2 0 0,1 19,10V5H17V3H19Z' },
            'xml': { color: '#FF6600', name: 'XML', icon: 'M5,3H7V5H5V10A2,2 0 0,1 3,12A2,2 0 0,1 5,14V19H7V21H5C3.93,20.73 3,20.1 3,19V15A2,2 0 0,0 1,13H0V11H1A2,2 0 0,0 3,9V5A2,2 0 0,1 5,3M19,3A2,2 0 0,1 21,5V9A2,2 0 0,0 23,11H24V13H23A2,2 0 0,0 21,15V19A2,2 0 0,1 19,21H17V19H19V14A2,2 0 0,1 21,12A2,2 0 0,1 19,10V5H17V3H19Z' },
            'py': { color: '#3776AB', name: 'PY', icon: 'M19.14,7.5A2.86,2.86 0 0,1 22,10.36V14.14A2.86,2.86 0 0,1 19.14,17H12C12,17.39 12.2,17.73 12.54,17.9A2.86,2.86 0 0,0 15.4,20.76V21.24A2.86,2.86 0 0,0 12.54,24.1C12.2,24.27 12,24.61 12,25H5.86A2.86,2.86 0 0,1 3,22.14V18.36A2.86,2.86 0 0,1 5.86,15.5H13C13,15.11 12.8,14.77 12.46,14.6A2.86,2.86 0 0,0 9.6,11.74V11.26A2.86,2.86 0 0,0 12.46,8.4C12.8,8.23 13,7.89 13,7.5H19.14Z' },
            
            // 电子书类
            'epub': { color: '#0EA5E9', name: 'EPUB', icon: 'M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.66 6.5,20.66C8.45,20.66 10.55,21.06 12,22.16C13.35,21.13 15.8,20.66 17.5,20.66C19.15,20.66 20.85,21 22.25,21.59C22.35,21.66 22.4,21.66 22.5,21.66C22.75,21.66 23,21.41 23,21.16V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,19.13 12,20.16C10.55,19.06 8.45,18.66 6.5,18.66C5.3,18.66 4.1,18.81 3,19.16V6.5C4.45,5.4 6.55,5 6.5,5Z' },
            'mobi': { color: '#FF6B35', name: 'MOBI', icon: 'M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.66 6.5,20.66C8.45,20.66 10.55,21.06 12,22.16C13.35,21.13 15.8,20.66 17.5,20.66C19.15,20.66 20.85,21 22.25,21.59C22.35,21.66 22.4,21.66 22.5,21.66C22.75,21.66 23,21.41 23,21.16V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,19.13 12,20.16C10.55,19.06 8.45,18.66 6.5,18.66C5.3,18.66 4.1,18.81 3,19.16V6.5C4.45,5.4 6.55,5 6.5,5Z' }
        };

        const fileType = fileTypes[extension] || { 
            color: '#64748B', 
            name: extension ? extension.toUpperCase() : 'FILE', 
            icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' 
        };

        // 生成SVG字符串并转换为data URL
        const svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
                <defs>
                    <linearGradient id="grad-${extension}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${fileType.color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${this.adjustBrightness(fileType.color, -20)};stop-opacity:1" />
                    </linearGradient>
                </defs>
                <!-- 文件图标背景 -->
                <rect x="8" y="8" width="64" height="64" rx="8" ry="8" fill="url(#grad-${extension})" opacity="0.1"/>
                <!-- 文件图标 -->
                <g transform="translate(16, 12) scale(2, 2)" fill="${fileType.color}">
                    <path d="${fileType.icon}"/>
                </g>
                <!-- 文件类型标签 -->
                <rect x="8" y="56" width="64" height="16" rx="8" ry="8" fill="${fileType.color}"/>
                <text x="40" y="66" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="10" font-weight="bold">
                    ${fileType.name.length > 6 ? fileType.name.substring(0, 6) : fileType.name}
                </text>
            </svg>
        `.trim();

        // 返回data URL
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
    }

    // 辅助方法：调整颜色亮度
    adjustBrightness(hex, percent) {
        // 移除 # 符号
        hex = hex.replace(/^#/, '');
        
        // 转换为RGB
        const num = parseInt(hex, 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                     (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                     (B < 255 ? B < 1 ? 0 : B : 255))
                     .toString(16).slice(1);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 添加公开方法：触发文件选择
    triggerFileSelect() {
        const fileInput = this.element.querySelector('.file-input');
        if (fileInput) {
            // 设置标志，防止container点击事件处理
            this.isProgrammaticClick = true;
            
            // 触发文件选择
            fileInput.click();
            
            // 延迟重置标志
            setTimeout(() => {
                this.isProgrammaticClick = false;
            }, 100);
        }
    }
};

/**
 * 提示组件
 */
PageComponents.Tips = class extends BaseComponent {
    constructor(config = {}) {
        const defaultConfig = {
            container: 'body',
            tips: [],
            onServiceClick: null,
            onVideoClick: null,
            onLinkClick: null
        };
        
        super({...defaultConfig, ...config});
    }

    static init(config) {
        const instance = new PageComponents.Tips(config);
        instance.render();
        return instance;
    }

    render() {
        this.injectStyles(`
            .tips-${this.componentId} {
                text-align: center;
                padding: 5px 10px 10px 10px;
                font-size: 14px;
                width: 100%;
                max-width: 500px;
                margin: 0 auto;
                color: #4f4f4f;
            }
            
            .tips-${this.componentId} a {
                text-decoration: none;
                color: #1890ff;
                font-weight: bold;
                cursor: pointer;
                transition: color 0.2s ease;
            }
            
            .tips-${this.componentId} a:hover {
                color: #40a9ff;
            }
        `);

        const tipsHtml = this.config.tips.map((tip, index) => {
            if (tip.action === 'link') {
                return `<p class="tips-${this.componentId}">${tip.text}<a href="${tip.linkUrl}" data-action="link" data-index="${index}">${tip.linkText}</a></p>`;
            } else if (tip.action === 'service') {
                return `<p class="tips-${this.componentId}">${tip.text}<a data-action="service">${tip.linkText}</a></p>`;
            } else if (tip.action === 'video') {
                return `<p class="tips-${this.componentId}">${tip.text}<a data-action="video">${tip.linkText}</a></p>`;
            }
            return `<p class="tips-${this.componentId}">${tip.text}</p>`;
        }).join('');

        const container = document.querySelector(this.config.container);
        const wrapper = document.createElement('div');
        wrapper.className = `tips-wrapper-${this.componentId}`;
        wrapper.innerHTML = tipsHtml;
        container.appendChild(wrapper);
        this.element = wrapper;

        this.bindEvents();
        return this;
    }

    bindEvents() {
        this.element.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="service"]')) {
                e.preventDefault();
                if (this.config.onServiceClick) {
                    this.config.onServiceClick();
                }
            } else if (e.target.matches('[data-action="video"]')) {
                e.preventDefault();
                if (this.config.onVideoClick) {
                    this.config.onVideoClick();
                }
            } else if (e.target.matches('[data-action="link"]')) {
                e.preventDefault();
                const index = parseInt(e.target.getAttribute('data-index'));
                const tip = this.config.tips[index];
                if (this.config.onLinkClick) {
                    this.config.onLinkClick(tip, index);
                }
                // 如果配置了链接URL，则跳转
                if (tip.linkUrl) {
                    window.location.href = tip.linkUrl;
                }
            }
        });
    }
};

/**
 * 最新订单组件
 */
PageComponents.RecentOrders = class extends BaseComponent {
    constructor(config = {}) {
        const defaultConfig = {
            container: 'body',
            title: '最新订单',
            buttonText: '下载',
            item_id: '',
            limit: 3,
            timeRange: 1,
            onlypaid: false,
            user_id: '',
            onButtonClick: null
        };
        
        super({...defaultConfig, ...config});
        this.orders = [];
    }

    static init(config) {
        const instance = new PageComponents.RecentOrders(config);
        instance.render();
        return instance;
    }

    render() {
        this.injectStyles(`
            .recent-orders-${this.componentId} {
                width: 100%;
                max-width: 500px;
                margin: 20px auto;
                padding: 0 16px;
            }
            
            .recent-orders-${this.componentId} .title {
                font-size: 16px;
                font-weight: 600;
                color: #666;
                margin-bottom: 12px;
                text-align: left;
                border-bottom: 1px solid #e0e0e0;
                padding-bottom: 8px;
            }
            
            .recent-orders-${this.componentId} .order-item {
                background: #ffffff;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                display: flex;
                align-items: center;
                gap: 12px;
                transition: all 0.2s ease;
            }
            
            .recent-orders-${this.componentId} .order-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
            }
            
            .recent-orders-${this.componentId} .order-icon {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .recent-orders-${this.componentId} .order-info {
                flex: 1;
                min-width: 0;
            }
            
            .recent-orders-${this.componentId} .order-name {
                font-size: 14px;
                font-weight: 500;
                color: #1b1b1b;
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .recent-orders-${this.componentId} .order-time {
                font-size: 12px;
                color: #717171;
            }
            
            .recent-orders-${this.componentId} .order-button {
                background: #667eea;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s ease;
                flex-shrink: 0;
            }
            
            .recent-orders-${this.componentId} .order-button:hover {
                background: #764ba2;
            }
            
            .recent-orders-${this.componentId} .order-button.delete-button {
                background: #EF4444;
                margin-right: 8px;
            }
            
            .recent-orders-${this.componentId} .order-button.delete-button:hover {
                background: #DC2626;
            }
            
            .recent-orders-${this.componentId} .action-buttons {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            

            
            /* 订单状态样式 */
            .recent-orders-${this.componentId} .order-status {
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                text-align: center;
                min-width: 60px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }

            .recent-orders-${this.componentId} .status-completed {
                background: #10B981;
                color: white;
            }

            .recent-orders-${this.componentId} .status-processing {
                background: #3B82F6;
                color: white;
                animation: pulse 1.5s ease-in-out infinite;
            }

            .recent-orders-${this.componentId} .status-created {
                background: #F59E0B;
                color: white;
            }

            .recent-orders-${this.componentId} .status-failed {
                background: #EF4444;
                color: white;
            }

            .recent-orders-${this.componentId} .status-spinner {
                width: 12px;
                height: 12px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top: 2px solid white;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `);

        const container = document.querySelector(this.config.container);
        const wrapper = document.createElement('div');
        wrapper.className = `recent-orders-${this.componentId}`;
        wrapper.style.display = 'none'; // 初始化时隐藏
        container.appendChild(wrapper);
        this.element = wrapper;

        this.loadOrders();
        return this;
    }

    async loadOrders() {
        try {
            // 直接调用订单API，返回已处理的订单数据
            this.orders = await this.fetchOrdersFromAPI();
            this.renderOrders();
        } catch (error) {
            console.warn('加载订单失败:', error);
            this.orders = [];
            this.renderOrders();
        }
    }

    async fetchOrdersFromAPI() {
        return new Promise((resolve, reject) => {
            const requestData = {
                user_id: this.config.user_id,
                openid: '',
                limit: Math.max(this.config.limit * 3, 20) // 获取更多记录用于筛选
            };
            
            console.log('PageComponents.RecentOrders: 获取订单列表', requestData);

            const http = {
                post: function(url, data, callback) {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", url, true);
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState == 4) {
                            callback(xhr.responseText);
                        }
                    };
                    if (typeof data == "object") {
                        const arr = [];
                        let i = 0;
                        for (const attr in data) {
                            arr[i] = encodeURIComponent(attr) + "=" + encodeURIComponent(data[attr]);
                            i++;
                        }
                        data = arr.join("&");
                        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    }
                    xhr.send(data);
                }
            };

            const protocol = (typeof getProtocol === 'function') ? getProtocol() : 
                           (window.location.protocol.indexOf('https') > -1 ? 'https:' : 'http:');
            const apiEndpoint = protocol + '//www.xiexinbao.com/yhl_order/mylist';
            http.post(apiEndpoint, requestData, (result) => {
                try {
                    const response = JSON.parse(result);
                    console.log('PageComponents.RecentOrders: 获取到订单数据', response);
                    const rawOrders = response.list || [];
                    const filteredOrders = this.filterOrders(rawOrders);
                    resolve(filteredOrders);
                } catch (e) {
                    console.error('PageComponents.RecentOrders: 获取订单列表失败:', e);
                    resolve([]);
                }
            });
        });
    }

    filterOrders(orders) {
        console.log('PageComponents.RecentOrders: 开始筛选订单', {
            totalOrders: orders.length,
            config: this.config
        });
        
        const filtered = orders.filter((order) => {
            // 按item_id筛选
            if (this.config.item_id) {
                if (order.item_id != this.config.item_id) {
                    return false;
                }
            }
            
            // 按结果状态筛选
            if (this.config.onlypaid) {
                // 已支付的订单，或者未支付但已创建的订单都显示
                if (order.pay_status !== "已支付" && order.data_out !== 'paid_do') {
                    return false;
                }
            }
            
            // 只显示有pay_callback的订单
            if (!order.pay_callback) {
                return false;
            }

            // 按时间范围筛选
            if (this.config.timeRange > 0) {
                const orderTime = new Date(parseInt(order.ctime) * 1000);
                const now = new Date();
                const daysDiff = (now - orderTime) / (1000 * 60 * 60 * 24);
                if (daysDiff > this.config.timeRange) {
                    return false;
                }
            }

            return true;
        });

        // 按时间排序，最新的在前
        filtered.sort((a, b) => {
            return parseInt(b.ctime) - parseInt(a.ctime);
        });

        // 限制数量
        const result = filtered.slice(0, this.config.limit);
        
        // 转换为组件需要的格式
        return result.map(order => ({
            id: order.id,
            name: this.getOrderFileName(order),
            time: this.formatTime(new Date(parseInt(order.ctime) * 1000)),
            status: this.getOrderStatus(order),
            // download_url: order.data_out && order.data_out.indexOf('http') === 0 ? order.data_out : null,
            download_url: order.pay_callback,
            pay_callback: order.pay_callback
        }));
    }

    getOrderFileName(order) {
        // 获取文件名
        let fileName = this.config.title.replace('最新', '');
        if (order.data_in) {
            try {
                const dataIn = JSON.parse(order.data_in);
                if (dataIn.ori_file_name) {
                    fileName = dataIn.ori_file_name.replace(/\.(jpg|jpeg|png|gif|bmp|webp)$/i, '') + '.pdf';
                }
            } catch (e) {
                console.log('PageComponents.RecentOrders: data_in解析失败', e);
            }
        }
        return fileName;
    }

    getOrderStatus(order) {
        const dataOut = order.data_out || '';
        
        if (dataOut === '') {
            return {
                status: 'processing',
                text: '进行中',
                className: 'status-processing'
            };
        } else if (dataOut.indexOf('http') === 0) {
            return {
                status: 'completed',
                text: '已完成',
                className: 'status-completed'
            };
        } else if (dataOut === 'paid_do') {
            return {
                status: 'created',
                text: '待支付',
                className: 'status-created'
            };
        } else {
            return {
                status: 'failed',
                text: '失败',
                className: 'status-failed'
            };
        }
    }

    formatTime(timestamp) {
        try {
            const date = new Date(timestamp * 1000);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return '刚刚';
            if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
            if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
            if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前';
            
            return date.toLocaleDateString();
        } catch (error) {
            return '未知时间';
        }
    }

    renderOrders() {
        if (this.orders.length === 0) {
            this.element.innerHTML = '';
            this.element.style.display = 'none';
            return;
        }

        const ordersHtml = this.orders.map(order => {
            // 根据状态生成右侧操作区域
            let actionArea = '';
            switch (order.status.status) {
                case 'completed':
                    // 已完成：显示删除按钮和下载按钮
                    actionArea = `<div class="action-buttons">
                        <button class="order-button delete-button" data-order-id="${order.id}" data-action="delete">删除</button>
                        <button class="order-button" data-order-id="${order.id}" data-action="download">${this.config.buttonText}</button>
                    </div>`;
                    break;
                case 'processing':
                    // 进行中：显示删除按钮和转圈状态
                    actionArea = `<div class="action-buttons">
                        <button class="order-button delete-button" data-order-id="${order.id}" data-action="delete">删除</button>
                        <div class="order-status ${order.status.className}">
                            <div class="status-spinner"></div>
                            ${order.status.text}
                        </div>
                    </div>`;
                    break;
                case 'created':
                    // 已创建：显示删除按钮和待支付状态
                    actionArea = `<div class="action-buttons">
                        <button class="order-button delete-button" data-order-id="${order.id}" data-action="delete">删除</button>
                        <div class="order-status ${order.status.className}">${order.status.text}</div>
                    </div>`;
                    break;
                case 'failed':
                    // 失败：显示删除按钮和失败状态
                    actionArea = `<div class="action-buttons">
                        <button class="order-button delete-button" data-order-id="${order.id}" data-action="delete">删除</button>
                        <div class="order-status ${order.status.className}">${order.status.text}</div>
                    </div>`;
                    break;
                default:
                    // 默认显示删除按钮和下载按钮
                    actionArea = `<div class="action-buttons">
                        <button class="order-button delete-button" data-order-id="${order.id}" data-action="delete">删除</button>
                        <button class="order-button" data-order-id="${order.id}" data-action="download">${this.config.buttonText}</button>
                    </div>`;
            }

            return `
                <div class="order-item" data-order-id="${order.id}" data-pay-callback="${order.pay_callback || ''}" style="cursor: pointer;">
                    <div class="order-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                    </div>
                    <div class="order-info">
                        <div class="order-name">${order.name || '未知订单'}</div>
                        <div class="order-time">${order.time || '未知时间'}</div>
                    </div>
                    ${actionArea}
                </div>
            `;
        }).join('');

        this.element.innerHTML = `
            <div class="title">${this.config.title}</div>
            ${ordersHtml}
        `;

        this.element.style.display = 'block';
        this.bindEvents();
    }

    deleteOrder(id){
        var r=confirm("确定删除数据? 删除后将无法找回该订单数据！");
        if (r==true){
            http_post({
                url:getProtocol()+'//www.xiexinbao.com/yhl_order/set',
                data:{
                    id:id, 
                    data_in:{},
                    status:0, 
                    data_out:'order_deleted', 
                    data_out_temp:'https://yhl.xiexinbao.com/common/icons/order_delete.jpg',
                    result_msg:'order_deleted'
                },callback:function(html){
                    http_post({url:getProtocol()+'//p.xiexinbao.com/csj_wxkefu_file/delete',data:{id:id},callback:function(fileDeleteResult){
                        window.location.reload();
                    }});
            }});
        } 
    }

    bindEvents() {
        this.element.addEventListener('click', (e) => {
            const button = e.target.closest('.order-button');
            const orderItem = e.target.closest('.order-item');
            
            if (button) {
                // 阻止事件冒泡
                e.stopPropagation();
                
                const orderId = button.getAttribute('data-order-id');
                const action = button.getAttribute('data-action');
                
                // 查找对应的订单
                const order = this.orders.find(o => o.id === orderId);
                if (!order) return;
                
                if (action === 'delete') {
                    // 删除按钮点击事件 - 您可以在这里添加自己的删除逻辑
                    console.log('删除订单:', orderId);
                    this.deleteOrder(orderId);
                    // 这里可以添加您的删除逻辑
                    // 例如：调用删除API、显示确认对话框等
                } else if (action === 'download') {
                // if (action === 'download' && order.download_url) {
                    // 直接下载
                    // this.downloadOrder(order);
                    window.location.href = order.pay_callback;
                } else if (order.pay_callback) {
                    // 跳转到订单页面
                    window.location.href = order.pay_callback;
                } else {
                    // 调用回调函数
                    if (this.config.onButtonClick) {
                        this.config.onButtonClick(orderId);
                    }
                }
            } else if (orderItem) {
                // 点击订单行，跳转到订单页面
                const payCallback = orderItem.getAttribute('data-pay-callback');
                if (payCallback) {
                    window.location.href = payCallback;
                }
            }
        });
    }

    downloadOrder(order) {
        try {
            // 创建下载链接
            const link = document.createElement('a');
            link.href = order.download_url;
            link.download = order.name || '订单文件';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 显示成功消息
            if (typeof $ShowCast !== 'undefined') {
                $ShowCast.success('开始下载');
            }
        } catch (error) {
            console.error('下载失败:', error);
            if (typeof $ShowCast !== 'undefined') {
                $ShowCast.error('下载失败，请重试');
            }
        }
    }

    // 重写show方法，只有在有订单时才显示
    show() { 
        if (this.element) {
            // 只有在有订单时才显示，否则保持隐藏
            if (this.orders && this.orders.length > 0) {
                this.element.style.display = '';
                this.isVisible = true;
            } else {
                this.element.style.display = 'none';
                this.isVisible = false;
            }
        }
    }
};

/**
 * 导出容器组件
 */
PageComponents.ExportContainer = class extends BaseComponent {
    constructor(config = {}) {
        const defaultConfig = {
            container: 'body',
            buttons: [
                { text: '继续添加', action: 'add', icon: 'plus' },
                { text: '合并PDF', action: 'export', icon: 'download' }
            ],
            onButtonClick: null
        };
        
        super({...defaultConfig, ...config});
    }

    static init(config) {
        const instance = new PageComponents.ExportContainer(config);
        instance.render();
        return instance;
    }

    render() {
        this.injectStyles(`
            .export-container-${this.componentId} {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
                border-top: 1px solid rgba(0,0,0,0.06);
                padding: 16px;
                padding-bottom: calc(16px + env(safe-area-inset-bottom));
                box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
                backdrop-filter: blur(10px);
                z-index: 10;
                transform: translateY(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .export-container-${this.componentId}.show {
                transform: translateY(0);
            }

            .export-container-${this.componentId} .buttons {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                gap: 16px;
            }

            .export-container-${this.componentId} .button {
                flex: 1;
                padding: 16px 0;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                color: white;
            }

            .export-container-${this.componentId} .button[data-action="add"],
            .export-container-${this.componentId} .button[data-action="reselect"] {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }

            .export-container-${this.componentId} .button[data-action="export"] {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }

            .export-container-${this.componentId} .button:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
            }

            .export-container-${this.componentId} .button:disabled {
                background: #e5e7eb;
                color: #9ca3af;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            .export-container-${this.componentId} .button svg {
                width: 20px;
                height: 20px;
            }
        `);

        const getIcon = (iconType) => {
            const icons = {
                plus: '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>',
                download: '<path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>',
                refresh: '<path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>',
                reselect: '<path d="M12 3L8 7h3v10h2V7h3l-4-4z"/><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2H6v2z"/>'
            };
            return icons[iconType] || icons.plus;
        };

        const buttonsHtml = this.config.buttons.map(button => `
            <button class="button" data-action="${button.action}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    ${getIcon(button.icon)}
                </svg>
                ${button.text}
            </button>
        `).join('');

        const html = `
            <div class="export-container-${this.componentId}">
                <div class="buttons">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        const container = document.querySelector(this.config.container);
        container.insertAdjacentHTML('beforeend', html);
        this.element = container.querySelector(`.export-container-${this.componentId}`);
        
        this.bindEvents();
        return this;
    }

    bindEvents() {
        this.element.addEventListener('click', (e) => {
            const button = e.target.closest('.button');
            if (button) {
                const action = button.getAttribute('data-action');
                if (this.config.onButtonClick) {
                    this.config.onButtonClick(action);
                }
            }
        });
    }

    show() {
        this.element.classList.add('show');
        this.isVisible = true;
    }

    hide() {
        this.element.classList.remove('show');
        this.isVisible = false;
    }
}; 

/**
 * 导出设置面板组件 - 通用版本
 * 只提供基础的面板显示/隐藏功能，具体内容由调用方自定义
 */
PageComponents.Export = class extends BaseComponent {
    constructor(config = {}) {
        const defaultConfig = {
            container: 'body',
            content: '', // 自定义面板内容HTML
            overlayClass: 'settings-overlay',
            panelClass: 'settings-panel',
            onShow: null,
            onHide: null,
            onConfirm: null,
            onCancel: null,
            getSettings: null // 获取设置参数的函数
        };
        
        super({...defaultConfig, ...config});
        this.isVisible = false;
    }

    static init(config) {
        const instance = new PageComponents.Export(config);
        instance.render();
        return instance;
    }

    render() {
        // 只提供最基础的样式
        this.injectStyles(`
            .${this.config.overlayClass}-${this.componentId} {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: none;
                z-index: 1005;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .${this.config.overlayClass}-${this.componentId}.show {
                display: block;
                opacity: 1;
            }
            
            .${this.config.panelClass}-${this.componentId} {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: white;
                border-top: 1px solid rgba(0,0,0,0.1);
                border-radius: 16px 16px 0 0;
                box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
                display: none;
                z-index: 1010;
                transform: translateY(100%);
                transition: transform 0.3s ease;
            }
            
            .${this.config.panelClass}-${this.componentId}.show {
                display: block;
                transform: translateY(0);
            }
        `);

        const html = `
            <!-- 设置面板遮罩 -->
            <div class="${this.config.overlayClass}-${this.componentId}" data-role="settings-overlay"></div>
            
            <!-- 设置面板 -->
            <div class="${this.config.panelClass}-${this.componentId}" data-role="panel">
                ${this.config.content}
            </div>
        `;

        const container = document.querySelector(this.config.container);
        container.insertAdjacentHTML('beforeend', html);
        
        this.overlayElement = container.querySelector(`[data-role="settings-overlay"]`);
        this.panelElement = container.querySelector(`[data-role="panel"]`);
        this.element = this.panelElement; // 主要元素是面板
        
        this.bindEvents();
        return this;
    }

    bindEvents() {
        // 点击遮罩关闭
        this.overlayElement.addEventListener('click', () => {
            this.hideSettings();
        });

        // 监听面板内的确认和取消按钮
        this.panelElement.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="confirm"]') || e.target.closest('[data-action="confirm"]')) {
                this.handleConfirm();
            } else if (e.target.matches('[data-action="cancel"]') || e.target.closest('[data-action="cancel"]')) {
                this.handleCancel();
            } else if (e.target.matches('[data-action="close"]') || e.target.closest('[data-action="close"]')) {
                this.hideSettings();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hideSettings();
            }
        });
    }

    showSettings() {
        this.overlayElement.classList.add('show');
        this.panelElement.classList.add('show');
        this.isVisible = true;
        
        // 防止页面滚动
        document.body.style.overflow = 'hidden';
        
        if (this.config.onShow) {
            this.config.onShow();
        }
    }

    hideSettings() {
        this.overlayElement.classList.remove('show');
        this.panelElement.classList.remove('show');
        this.isVisible = false;
        
        // 恢复页面滚动
        document.body.style.overflow = '';
        
        if (this.config.onHide) {
            this.config.onHide();
        }
    }

    handleConfirm() {
        if (this.config.onConfirm) {
            // 获取设置参数
            const settings = this.config.getSettings ? this.config.getSettings() : {};
            this.config.onConfirm(settings);
        }
        this.hideSettings();
    }

    handleCancel() {
        if (this.config.onCancel) {
            this.config.onCancel();
        }
        this.hideSettings();
    }

    // 获取设置参数的公共方法
    getSettings() {
        return this.config.getSettings ? this.config.getSettings() : {};
    }

    show() {
        this.showSettings();
    }

    hide() {
        this.hideSettings();
    }
}; 

 

/**
 * 视频教程弹窗组件
 */
PageComponents.VideoTutorial = class extends BaseComponent {
    constructor(config = {}) {
        const defaultConfig = {
            container: 'body',
            title: '使用教程',
            videoUrl: '', // 视频URL
            posterUrl: '', // 视频封面图URL（可选）
            description: '观看视频了解如何使用', // 描述文本（可选）
            autoplay: false, // 是否自动播放
            controls: true, // 是否显示控制条
            width: '90%', // 弹窗宽度
            maxWidth: '800px', // 最大宽度
            onClose: null, // 关闭回调
            onVideoLoad: null, // 视频加载完成回调
            onVideoError: null // 视频加载错误回调
        };
        
        super({...defaultConfig, ...config});
        this.isOpen = false;
    }

    static init(config) {
        const instance = new PageComponents.VideoTutorial(config);
        instance.render();
        return instance;
    }

    render() {
        this.injectStyles(`
            .video-tutorial-overlay-${this.componentId} {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                display: none;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.3s ease;
                overflow-y: auto;
                padding: 20px;
                box-sizing: border-box;
            }
            
            .video-tutorial-overlay-${this.componentId}.show {
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 1;
            }
            
            .video-tutorial-modal-${this.componentId} {
                background: white;
                border-radius: 16px;
                width: auto;
                max-width: 95vw;
                max-height: 95vh;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s ease;
                overflow: hidden;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            
            .video-tutorial-overlay-${this.componentId}.show .video-tutorial-modal-${this.componentId} {
                transform: scale(1) translateY(0);
            }
            
            .video-tutorial-header-${this.componentId} {
                padding: 24px 24px 16px;
                border-bottom: 1px solid #f0f0f0;
                position: relative;
                flex-shrink: 0;
            }
            
            .video-tutorial-title-${this.componentId} {
                font-size: 20px;
                font-weight: 600;
                color: #1a1a1a;
                margin: 0;
                padding-right: 40px;
            }
            
            .video-tutorial-description-${this.componentId} {
                font-size: 14px;
                color: #666;
                margin: 8px 0 0 0;
                line-height: 1.4;
            }
            
            .video-tutorial-close-${this.componentId} {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 32px;
                height: 32px;
                border: none;
                background: #f5f5f5;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                color: #666;
                font-size: 18px;
                line-height: 1;
            }
            
            .video-tutorial-close-${this.componentId}:hover {
                background: #e8e8e8;
                color: #333;
                transform: scale(1.05);
            }
            
            .video-tutorial-content-${this.componentId} {
                padding: 0;
                position: relative;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 0;
            }
            
            .video-tutorial-video-${this.componentId} {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                display: block;
                background: #000;
                border-radius: 0;
                object-fit: contain;
                outline: none;
            }
            
            .video-tutorial-video-${this.componentId}::-webkit-media-controls-panel {
                background-color: rgba(0, 0, 0, 0.8);
            }
            
            .video-tutorial-video-${this.componentId}::-webkit-media-controls-play-button,
            .video-tutorial-video-${this.componentId}::-webkit-media-controls-timeline,
            .video-tutorial-video-${this.componentId}::-webkit-media-controls-current-time-display,
            .video-tutorial-video-${this.componentId}::-webkit-media-controls-time-remaining-display,
            .video-tutorial-video-${this.componentId}::-webkit-media-controls-mute-button,
            .video-tutorial-video-${this.componentId}::-webkit-media-controls-volume-slider,
            .video-tutorial-video-${this.componentId}::-webkit-media-controls-fullscreen-button {
                color: white;
            }
            
            .video-tutorial-loading-${this.componentId} {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 16px;
                display: none;
            }
            
            .video-tutorial-error-${this.componentId} {
                padding: 40px 24px;
                text-align: center;
                color: #666;
                display: none;
            }
            
            .video-tutorial-error-icon-${this.componentId} {
                font-size: 48px;
                color: #ff4d4f;
                margin-bottom: 16px;
            }
            
            .video-tutorial-error-text-${this.componentId} {
                font-size: 16px;
                margin-bottom: 8px;
            }
            
            .video-tutorial-error-detail-${this.componentId} {
                font-size: 14px;
                color: #999;
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .video-tutorial-overlay-${this.componentId} {
                    padding: 5px;
                }
                
                .video-tutorial-modal-${this.componentId} {
                    max-width: 98vw;
                    max-height: 98vh;
                }
                
                .video-tutorial-header-${this.componentId} {
                    padding: 16px 16px 12px;
                }
                
                .video-tutorial-title-${this.componentId} {
                    font-size: 16px;
                    padding-right: 35px;
                }
                
                .video-tutorial-close-${this.componentId} {
                    width: 28px;
                    height: 28px;
                    top: 12px;
                    right: 12px;
                    font-size: 16px;
                }
                
                .video-tutorial-description-${this.componentId} {
                    font-size: 13px;
                }
            }
            
            /* 动画效果 */
            @keyframes videoTutorialFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            .video-tutorial-modal-${this.componentId}.animate-in {
                animation: videoTutorialFadeIn 0.3s ease forwards;
            }
        `);

        const html = `
            <div class="video-tutorial-overlay-${this.componentId}" data-role="video-tutorial-overlay">
                <div class="video-tutorial-modal-${this.componentId}" data-role="modal">
                    <div class="video-tutorial-header-${this.componentId}">
                        <h3 class="video-tutorial-title-${this.componentId}">${this.config.title}</h3>
                        ${this.config.description ? `<p class="video-tutorial-description-${this.componentId}">${this.config.description}</p>` : ''}
                        <button class="video-tutorial-close-${this.componentId}" data-action="close" aria-label="关闭">×</button>
                    </div>
                    <div class="video-tutorial-content-${this.componentId}">
                        <div class="video-tutorial-loading-${this.componentId}" data-role="loading">
                            正在加载视频...
                        </div>
                        <div class="video-tutorial-error-${this.componentId}" data-role="error">
                            <div class="video-tutorial-error-icon-${this.componentId}">⚠️</div>
                            <div class="video-tutorial-error-text-${this.componentId}">视频加载失败</div>
                            <div class="video-tutorial-error-detail-${this.componentId}">请检查网络连接或稍后重试</div>
                        </div>
                        <video 
                            class="video-tutorial-video-${this.componentId}" 
                            data-role="video"
                            ${this.config.controls ? 'controls' : ''}
                            ${this.config.autoplay ? 'autoplay' : ''}
                            ${this.config.posterUrl ? `poster="${this.config.posterUrl}"` : ''}
                            preload="metadata"
                            playsinline
                            webkit-playsinline
                        >
                            ${this.config.videoUrl ? `<source src="${this.config.videoUrl}" type="video/mp4">` : ''}
                            您的浏览器不支持视频播放。
                        </video>
                    </div>
                </div>
            </div>
        `;

        const container = document.querySelector(this.config.container);
        container.insertAdjacentHTML('beforeend', html);
        
        this.element = container.querySelector(`[data-role="video-tutorial-overlay"]`);
        this.modal = container.querySelector(`[data-role="modal"]`);
        this.video = container.querySelector(`[data-role="video"]`);
        this.loading = container.querySelector(`[data-role="loading"]`);
        this.error = container.querySelector(`[data-role="error"]`);
        
        this.bindEvents();
        return this;
    }

    bindEvents() {
        // 关闭按钮事件
        this.element.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'close' || e.target === this.element) {
                this.close();
            }
        });

        // ESC键关闭
        this.escKeyHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };

        // 视频事件
        if (this.video) {
            this.video.addEventListener('loadstart', () => {
                this.showLoading();
            });

            this.video.addEventListener('loadedmetadata', () => {
                this.adjustModalSize();
            });

            this.video.addEventListener('canplay', () => {
                this.hideLoading();
                this.hideError();
                this.adjustModalSize();
                if (this.config.onVideoLoad) {
                    this.config.onVideoLoad(this.video);
                }
            });

            this.video.addEventListener('error', (e) => {
                this.hideLoading();
                this.showError();
                if (this.config.onVideoError) {
                    this.config.onVideoError(e, this.video);
                }
            });

            // 阻止视频区域的点击事件冒泡
            this.video.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // 阻止模态框内容区域的点击事件冒泡，但允许关闭按钮的点击事件
        this.modal.addEventListener('click', (e) => {
            // 如果点击的是关闭按钮，不阻止事件冒泡
            if (e.target.dataset.action === 'close') {
                return;
            }
            e.stopPropagation();
        });

        // 窗口大小变化时重新调整弹窗尺寸
        this.resizeHandler = () => {
            if (this.isOpen && this.video && this.video.videoWidth) {
                this.adjustModalSize();
            }
        };
        window.addEventListener('resize', this.resizeHandler);
        
        // 直接绑定关闭按钮事件，确保能正常工作
        const closeButton = this.element.querySelector(`[data-action="close"]`);
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        }
    }

    // 打开弹窗
    open(videoUrl = null) {
        if (videoUrl) {
            this.updateVideoUrl(videoUrl);
        }

        if (!this.config.videoUrl && !videoUrl) {
            console.error('VideoTutorial: 缺少视频URL');
            return;
        }

        this.isOpen = true;
        this.element.classList.add('show');
        this.modal.classList.add('animate-in');
        
        // 添加ESC键监听
        document.addEventListener('keydown', this.escKeyHandler);
        
        // 防止页面滚动
        document.body.style.overflow = 'hidden';

        return this;
    }

    // 关闭弹窗
    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.element.classList.remove('show');
        this.modal.classList.remove('animate-in');
        
        // 暂停视频
        if (this.video && !this.video.paused) {
            this.video.pause();
        }
        
        // 移除ESC键监听
        document.removeEventListener('keydown', this.escKeyHandler);
        
        // 恢复页面滚动
        document.body.style.overflow = '';

        if (this.config.onClose) {
            this.config.onClose();
        }

        return this;
    }

    // 根据视频尺寸调整弹窗大小
    adjustModalSize() {
        if (!this.video || !this.modal) return;

        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        
        if (!videoWidth || !videoHeight) return;

        // 获取视口尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 计算可用空间（减去padding和header高度）
        const headerHeight = this.element.querySelector(`.video-tutorial-header-${this.componentId}`).offsetHeight || 80;
        const padding = viewportWidth <= 768 ? 10 : 40; // 移动设备用更小的padding
        
        const availableWidth = viewportWidth - padding;
        const availableHeight = viewportHeight - padding - headerHeight;
        
        // 计算视频的宽高比
        const aspectRatio = videoWidth / videoHeight;
        
        // 根据可用空间和宽高比计算最佳尺寸
        let modalWidth, videoDisplayHeight;
        
        if (availableWidth / aspectRatio <= availableHeight) {
            // 宽度受限
            modalWidth = Math.min(availableWidth, videoWidth);
            videoDisplayHeight = modalWidth / aspectRatio;
        } else {
            // 高度受限
            videoDisplayHeight = Math.min(availableHeight, videoHeight);
            modalWidth = videoDisplayHeight * aspectRatio;
        }
        
        // 设置最小尺寸
        const minWidth = Math.min(320, viewportWidth * 0.8);
        const minHeight = Math.min(240, viewportHeight * 0.3);
        
        modalWidth = Math.max(modalWidth, minWidth);
        videoDisplayHeight = Math.max(videoDisplayHeight, minHeight);
        
        // 应用尺寸
        this.modal.style.width = `${modalWidth}px`;
        this.modal.style.height = `${videoDisplayHeight + headerHeight}px`;
        
        // 确保视频填充内容区域
        this.video.style.width = `${modalWidth}px`;
        this.video.style.height = `${videoDisplayHeight}px`;
        
        console.log(`视频尺寸调整: ${videoWidth}x${videoHeight} -> ${modalWidth}x${videoDisplayHeight}`);
    }

    // 更新视频URL
    updateVideoUrl(videoUrl) {
        this.config.videoUrl = videoUrl;
        if (this.video) {
            this.video.innerHTML = `
                <source src="${videoUrl}" type="video/mp4">
                您的浏览器不支持视频播放。
            `;
            this.video.load(); // 重新加载视频
        }
    }

    // 更新标题
    updateTitle(title) {
        this.config.title = title;
        const titleElement = this.element.querySelector(`.video-tutorial-title-${this.componentId}`);
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    // 更新描述
    updateDescription(description) {
        this.config.description = description;
        const descElement = this.element.querySelector(`.video-tutorial-description-${this.componentId}`);
        if (descElement) {
            descElement.textContent = description;
        }
    }

    // 显示加载状态
    showLoading() {
        if (this.loading) {
            this.loading.style.display = 'block';
        }
        if (this.error) {
            this.error.style.display = 'none';
        }
    }

    // 隐藏加载状态
    hideLoading() {
        if (this.loading) {
            this.loading.style.display = 'none';
        }
    }

    // 显示错误状态
    showError() {
        if (this.error) {
            this.error.style.display = 'block';
        }
        if (this.loading) {
            this.loading.style.display = 'none';
        }
    }

    // 隐藏错误状态
    hideError() {
        if (this.error) {
            this.error.style.display = 'none';
        }
    }

    // 获取视频元素（供外部操作）
    getVideoElement() {
        return this.video;
    }

    // 检查是否打开
    isOpened() {
        return this.isOpen;
    }

    // 销毁组件
    destroy() {
        if (this.isOpen) {
            this.close();
        }
        
        // 移除事件监听
        document.removeEventListener('keydown', this.escKeyHandler);
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        // 调用父类销毁方法
        super.destroy();
    }
};