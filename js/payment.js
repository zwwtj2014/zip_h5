// 付费系统模块
class PaymentSystem {
    constructor() {
        this.apiBase = 'http://p.xiexinbao.com';
        this.isVip = false;
        this.phoneNumber = '';
        this.currentPlan = null;
        
        this.init();
    }
    
    init() {
        // 检查本地存储的用户状态
        this.loadUserStatus();
        console.log('💳 PaymentSystem initialized');
    }
    
    loadUserStatus() {
        // 从localStorage检查用户状态
        const vipStatus = localStorage.getItem('vip_status');
        const phone = localStorage.getItem('user_phone');
        
        if (vipStatus) {
            try {
                const status = JSON.parse(vipStatus);
                if (status.expires && new Date(status.expires) > new Date()) {
                    this.isVip = true;
                    this.currentPlan = status.plan;
                    console.log('👑 User is VIP:', status);
                }
            } catch (error) {
                console.log('VIP status parse error:', error);
            }
        }
        
        if (phone) {
            this.phoneNumber = phone;
            console.log('📱 Phone number loaded');
        }
    }
    
    // 检查文件是否需要付费下载
    checkDownloadPermission(fileSize) {
        const fileSizeMB = fileSize / (1024 * 1024);
        
        // VIP用户无限制
        if (this.isVip) {
            return {
                allowed: true,
                type: 'vip',
                reason: '会员用户'
            };
        }
        
        // 小文件免费
        if (fileSizeMB <= 10) {
            return {
                allowed: true,
                type: 'free',
                reason: '文件小于10MB'
            };
        }
        
        // 大文件需要付费或绑定手机号
        return {
            allowed: false,
            type: 'payment_required',
            reason: '文件超过10MB',
            fileSize: fileSizeMB
        };
    }
    
    // 显示付费弹框
    showPaymentModal(fileSize, reason = '文件过大') {
        const modal = document.getElementById('paymentModal');
        const fileSizeNotice = document.getElementById('fileSizeNotice');
        
        if (!modal) return;
        
        // 更新文件大小提示
        if (fileSizeNotice) {
            const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
            fileSizeNotice.querySelector('p').innerHTML = 
                `文件大小为 <strong>${sizeMB}MB</strong>，请选择下载方式：`;
        }
        
        modal.style.display = 'flex';
        
        // 绑定事件
        this.bindPaymentEvents();
        
        // 付费弹框显示打点
        window.analytics.paymentShow(reason, fileSize);
        window.analytics.modalOpen('payment_modal');
        
        console.log('💳 Payment modal shown for', fileSize, 'bytes');
    }
    
    bindPaymentEvents() {
        // 避免重复绑定
        if (this.eventsBound) return;
        this.eventsBound = true;
        
        const closeBtn = document.getElementById('closePaymentModal');
        const chooseFreeBtn = document.getElementById('chooseFreeBtn');
        const chooseVipBtn = document.getElementById('chooseVipBtn');
        const bindPhoneBtn = document.getElementById('bindPhoneBtn');
        const purchaseVipBtn = document.getElementById('purchaseVipBtn');
        
        // 关闭弹框
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePaymentModal();
            });
        }
        
        // 选择免费下载
        if (chooseFreeBtn) {
            chooseFreeBtn.addEventListener('click', () => {
                window.analytics.paymentChoice('free_attempt');
                this.showPhoneBinding();
            });
        }
        
        // 选择会员下载
        if (chooseVipBtn) {
            chooseVipBtn.addEventListener('click', () => {
                window.analytics.paymentChoice('vip_attempt');
                this.showVipPurchase();
            });
        }
        
        // 绑定手机号
        if (bindPhoneBtn) {
            bindPhoneBtn.addEventListener('click', () => {
                this.handlePhoneBinding();
            });
        }
        
        // 购买VIP
        if (purchaseVipBtn) {
            purchaseVipBtn.addEventListener('click', () => {
                this.handleVipPurchase();
            });
        }
        
        // VIP套餐选择
        const planItems = document.querySelectorAll('.plan-item');
        planItems.forEach(item => {
            item.addEventListener('click', () => {
                planItems.forEach(p => p.classList.remove('selected'));
                item.classList.add('selected');
                this.currentPlan = item.dataset.plan;
            });
        });
        
        // 默认选择年度套餐
        const yearPlan = document.querySelector('.plan-item[data-plan="year"]');
        if (yearPlan) {
            yearPlan.classList.add('selected');
            this.currentPlan = 'year';
        }
    }
    
    hidePaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.style.display = 'none';
            window.analytics.modalClose('payment_modal');
        }
    }
    
    showPhoneBinding() {
        const phoneBinding = document.getElementById('phoneBinding');
        const vipPurchase = document.getElementById('vipPurchase');
        
        if (phoneBinding) phoneBinding.style.display = 'block';
        if (vipPurchase) vipPurchase.style.display = 'none';
        
        // 如果已有手机号，预填充
        const phoneInput = document.getElementById('phoneInput');
        if (phoneInput && this.phoneNumber) {
            phoneInput.value = this.phoneNumber;
        }
    }
    
    showVipPurchase() {
        const phoneBinding = document.getElementById('phoneBinding');
        const vipPurchase = document.getElementById('vipPurchase');
        
        if (phoneBinding) phoneBinding.style.display = 'none';
        if (vipPurchase) vipPurchase.style.display = 'block';
    }
    
    async handlePhoneBinding() {
        const phoneInput = document.getElementById('phoneInput');
        if (!phoneInput) return;
        
        const phone = phoneInput.value.trim();
        
        // 验证手机号
        if (!this.validatePhone(phone)) {
            this.showToast('⚠️ 请输入正确的手机号码');
            return;
        }
        
        try {
            // 模拟绑定手机号（实际应用中需要短信验证）
            await this.bindPhone(phone);
            
            this.phoneNumber = phone;
            localStorage.setItem('user_phone', phone);
            
            // 绑定成功打点
            window.analytics.phoneBinding(true, phone);
            
            this.showToast('✅ 手机号绑定成功！');
            this.hidePaymentModal();
            
            // 延迟后开始下载
            setTimeout(() => {
                this.startDownload('free_with_phone');
            }, 1000);
            
        } catch (error) {
            console.error('Phone binding error:', error);
            window.analytics.phoneBinding(false);
            this.showToast('❌ 绑定失败，请重试');
        }
    }
    
    async handleVipPurchase() {
        if (!this.currentPlan) {
            this.showToast('⚠️ 请选择会员套餐');
            return;
        }
        
        const prices = {
            month: 9.9,
            year: 99
        };
        
        const price = prices[this.currentPlan];
        
        try {
            // VIP购买打点
            window.analytics.vipPurchase(this.currentPlan, price);
            
            // 模拟支付流程（实际应用中需要对接支付接口）
            await this.processVipPayment(this.currentPlan, price);
            
            // 设置VIP状态
            const expiresDate = new Date();
            if (this.currentPlan === 'month') {
                expiresDate.setMonth(expiresDate.getMonth() + 1);
            } else {
                expiresDate.setFullYear(expiresDate.getFullYear() + 1);
            }
            
            const vipStatus = {
                plan: this.currentPlan,
                price: price,
                expires: expiresDate.toISOString(),
                purchaseTime: new Date().toISOString()
            };
            
            localStorage.setItem('vip_status', JSON.stringify(vipStatus));
            this.isVip = true;
            
            this.showToast('🎉 会员开通成功！');
            this.hidePaymentModal();
            
            // 延迟后开始下载
            setTimeout(() => {
                this.startDownload('vip');
            }, 1000);
            
        } catch (error) {
            console.error('VIP purchase error:', error);
            this.showToast('❌ 购买失败，请重试');
        }
    }
    
    async bindPhone(phone) {
        // 模拟API调用
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90%成功率
                    resolve({ success: true });
                } else {
                    reject(new Error('网络错误'));
                }
            }, 1000);
        });
    }
    
    async processVipPayment(plan, price) {
        // 模拟支付流程
        return new Promise((resolve, reject) => {
            // 简化版支付，实际需要对接支付宝/微信支付
            setTimeout(() => {
                if (Math.random() > 0.05) { // 95%成功率
                    resolve({ 
                        success: true, 
                        paymentId: 'pay_' + Date.now(),
                        plan: plan,
                        price: price
                    });
                } else {
                    reject(new Error('支付失败'));
                }
            }, 2000);
        });
    }
    
    startDownload(downloadType) {
        // 获取压缩结果
        const compressResult = JSON.parse(sessionStorage.getItem('compressResult') || '{}');
        const compressedBlob = window.compressedBlob;
        
        if (!compressedBlob || !compressResult.fileName) {
            this.showToast('❌ 下载数据丢失，请重新压缩');
            window.location.href = 'index.html';
            return;
        }
        
        // 下载开始打点
        window.analytics.downloadStart(downloadType, compressResult.compressedSize, compressResult.fileName);
        
        // 创建下载链接
        const url = URL.createObjectURL(compressedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = compressResult.fileName + '.zip';
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 释放URL对象
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
        
        // 下载完成打点
        window.analytics.downloadComplete(downloadType, compressResult.compressedSize);
        
        this.showToast('⬇️ 下载已开始！');
        
        console.log('📥 Download started:', downloadType);
    }
    
    // 验证手机号格式
    validatePhone(phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    }
    
    // 检查VIP状态
    checkVipStatus() {
        return this.isVip;
    }
    
    // 获取用户手机号
    getPhoneNumber() {
        return this.phoneNumber;
    }
    
    // 显示提示
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
        const existingToast = document.querySelector('.payment-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `payment-toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10001;
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

// 全局付费系统实例
window.PaymentSystem = new PaymentSystem();
window.paymentSystem = window.PaymentSystem;

console.log('💳 Payment module loaded');