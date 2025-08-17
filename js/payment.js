// 付费系统模块
function PaymentSystem() {
    this.apiBase = 'http://p.xiexinbao.com';
    this.isVip = false;
    this.phoneNumber = '';
    this.currentPlan = null;
    
    this.init();
}

PaymentSystem.prototype.init = function() {
    // 检查本地存储的用户状态
    this.loadUserStatus();
    console.log('💳 PaymentSystem initialized');
};
    
PaymentSystem.prototype.loadUserStatus = function() {
    // 从localStorage检查用户状态
    var vipStatus = localStorage.getItem('vip_status');
    var phone = localStorage.getItem('user_phone');
    
    if (vipStatus) {
        try {
            var status = JSON.parse(vipStatus);
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
};
    
// 检查文件是否需要付费下载
PaymentSystem.prototype.checkDownloadPermission = function(fileSize) {
    var fileSizeMB = fileSize / (1024 * 1024);
    
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
};
    
// 显示付费弹框
PaymentSystem.prototype.showPaymentModal = function(fileSize, reason) {
    reason = reason || '文件过大';
    var modal = document.getElementById('paymentModal');
    var fileSizeNotice = document.getElementById('fileSizeNotice');
    
    if (!modal) return;
    
    // 更新文件大小提示
    if (fileSizeNotice) {
        var sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
        fileSizeNotice.querySelector('p').innerHTML = 
            '文件大小为 <strong>' + sizeMB + 'MB</strong>，请选择下载方式：';
    }
    
    modal.style.display = 'flex';
    
    // 绑定事件
    this.bindPaymentEvents();
    
    // 付费弹框显示日志
    console.log('💳 显示付费弹框:', reason, '文件大小:', (fileSize / (1024 * 1024)).toFixed(1) + 'MB');
    
    console.log('💳 Payment modal shown for', fileSize, 'bytes');
};
    
PaymentSystem.prototype.bindPaymentEvents = function() {
    var self = this;
    // 避免重复绑定
    if (this.eventsBound) return;
    this.eventsBound = true;
    
    var closeBtn = document.getElementById('closePaymentModal');
    var chooseFreeBtn = document.getElementById('chooseFreeBtn');
    var chooseVipBtn = document.getElementById('chooseVipBtn');
    var bindPhoneBtn = document.getElementById('bindPhoneBtn');
    var purchaseVipBtn = document.getElementById('purchaseVipBtn');
    
    // 关闭弹框
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            self.hidePaymentModal();
        });
    }
    
    // 选择免费下载
    if (chooseFreeBtn) {
        chooseFreeBtn.addEventListener('click', function() {
            console.log('🆓 选择免费下载');
            self.showPhoneBinding();
        });
    }
    
    // 选择会员下载
    if (chooseVipBtn) {
        chooseVipBtn.addEventListener('click', function() {
            console.log('📎 选择VIP下载');
            self.showVipPurchase();
        });
    }
    
    // 绑定手机号
    if (bindPhoneBtn) {
        bindPhoneBtn.addEventListener('click', function() {
            self.handlePhoneBinding();
        });
    }
    
    // 购买VIP
    if (purchaseVipBtn) {
        purchaseVipBtn.addEventListener('click', function() {
            self.handleVipPurchase();
        });
    }
    
    // VIP套餐选择
    var planItems = document.querySelectorAll('.plan-item');
    var i;
    for (i = 0; i < planItems.length; i++) {
        planItems[i].addEventListener('click', function() {
            var j;
            for (j = 0; j < planItems.length; j++) {
                planItems[j].classList.remove('selected');
            }
            this.classList.add('selected');
            self.currentPlan = this.dataset.plan;
        });
    }
    
    // 默认选择年度套餐
    var yearPlan = document.querySelector('.plan-item[data-plan="year"]');
    if (yearPlan) {
        yearPlan.classList.add('selected');
        this.currentPlan = 'year';
    }
};
    
PaymentSystem.prototype.hidePaymentModal = function() {
    var modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
    }
};
    
PaymentSystem.prototype.showPhoneBinding = function() {
    var phoneBinding = document.getElementById('phoneBinding');
    var vipPurchase = document.getElementById('vipPurchase');
    
    if (phoneBinding) phoneBinding.style.display = 'block';
    if (vipPurchase) vipPurchase.style.display = 'none';
    
    // 如果已有手机号，预填充
    var phoneInput = document.getElementById('phoneInput');
    if (phoneInput && this.phoneNumber) {
        phoneInput.value = this.phoneNumber;
    }
};
    
PaymentSystem.prototype.showVipPurchase = function() {
    var phoneBinding = document.getElementById('phoneBinding');
    var vipPurchase = document.getElementById('vipPurchase');
    
    if (phoneBinding) phoneBinding.style.display = 'none';
    if (vipPurchase) vipPurchase.style.display = 'block';
};
    
PaymentSystem.prototype.handlePhoneBinding = function() {
    var self = this;
    var phoneInput = document.getElementById('phoneInput');
    if (!phoneInput) return;
    
    var phone = phoneInput.value.trim();
    
    // 验证手机号
    if (!this.validatePhone(phone)) {
        this.showToast('⚠️ 请输入正确的手机号码');
        return;
    }
    
    // 模拟绑定手机号（实际应用中需要短信验证）
    this.bindPhone(phone).then(function() {
        self.phoneNumber = phone;
        localStorage.setItem('user_phone', phone);
        
        // 绑定成功日志
        console.log('📱 手机绑定成功');
        
        self.showToast('✅ 手机号绑定成功！');
        self.hidePaymentModal();
        
        // 延迟后开始下载
        setTimeout(function() {
            self.startDownload('free_with_phone');
        }, 1000);
        
    }).catch(function(error) {
        console.error('Phone binding error:', error);
        console.error('❌ 手机绑定失败');
        self.showToast('❌ 绑定失败，请重试');
    });
};
    
PaymentSystem.prototype.handleVipPurchase = function() {
    var self = this;
    if (!this.currentPlan) {
        this.showToast('⚠️ 请选择会员套餐');
        return;
    }
    
    var prices = {
        month: 9.9,
        year: 99
    };
    
    var price = prices[this.currentPlan];
    
    // VIP购买日志
    console.log('👑 购买VIP:', this.currentPlan, '价格:', price + '元');
    
    // 模拟支付流程（实际应用中需要对接支付接口）
    this.processVipPayment(this.currentPlan, price).then(function() {
        // 设置VIP状态
        var expiresDate = new Date();
        if (self.currentPlan === 'month') {
            expiresDate.setMonth(expiresDate.getMonth() + 1);
        } else {
            expiresDate.setFullYear(expiresDate.getFullYear() + 1);
        }
        
        var vipStatus = {
            plan: self.currentPlan,
            price: price,
            expires: expiresDate.toISOString(),
            purchaseTime: new Date().toISOString()
        };
        
        localStorage.setItem('vip_status', JSON.stringify(vipStatus));
        self.isVip = true;
        
        self.showToast('🎉 会员开通成功！');
        self.hidePaymentModal();
        
        // 延迟后开始下载
        setTimeout(function() {
            self.startDownload('vip');
        }, 1000);
        
    }).catch(function(error) {
        console.error('VIP purchase error:', error);
        self.showToast('❌ 购买失败，请重试');
    });
};
    
PaymentSystem.prototype.bindPhone = function(phone) {
    // 模拟API调用
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            if (Math.random() > 0.1) { // 90%成功率
                resolve({ success: true });
            } else {
                reject(new Error('网络错误'));
            }
        }, 1000);
    });
};
    
PaymentSystem.prototype.processVipPayment = function(plan, price) {
    // 模拟支付流程
    return new Promise(function(resolve, reject) {
        // 简化版支付，实际需要对接支付宝/微信支付
        setTimeout(function() {
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
};
    
PaymentSystem.prototype.startDownload = function(downloadType) {
    var self = this;
    // 获取压缩结果
    var compressResult = JSON.parse(sessionStorage.getItem('compressResult') || '{}');
    var compressedBlob = window.compressedBlob;
    
    if (!compressedBlob || !compressResult.fileName) {
        this.showToast('❌ 下载数据丢失，请重新压缩');
        window.location.href = 'index.html';
        return;
    }
    
    // 下载开始日志
    console.log('📥 开始下载:', downloadType, '文件大小:', (compressResult.compressedSize / (1024 * 1024)).toFixed(2) + 'MB');
    
    // 创建下载链接
    var url = URL.createObjectURL(compressedBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = compressResult.fileName + '.zip';
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
    
    this.showToast('⬇️ 下载已开始！');
    
    console.log('📥 Download started:', downloadType);
};
    
// 验证手机号格式
PaymentSystem.prototype.validatePhone = function(phone) {
    var phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
};
    
// 检查VIP状态
PaymentSystem.prototype.checkVipStatus = function() {
    return this.isVip;
};
    
// 获取用户手机号
PaymentSystem.prototype.getPhoneNumber = function() {
    return this.phoneNumber;
};
    
// 显示提示
PaymentSystem.prototype.showToast = function(message, type) {
    type = type || 'info';
    if (window.customToast && typeof window.customToast.show === 'function') {
        window.customToast.show(message, type);
    } else {
        // 使用简单toast
        this.createSimpleToast(message, type);
    }
};
    
PaymentSystem.prototype.createSimpleToast = function(message, type) {
    // 移除现有的toast
    var existingToast = document.querySelector('.payment-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    var toast = document.createElement('div');
    toast.className = 'payment-toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(0, 0, 0, 0.8); color: white; padding: 12px 20px; border-radius: 8px; z-index: 10001; font-size: 14px; max-width: 300px; backdrop-filter: blur(10px); animation: slideInRight 0.3s ease-out;';
    
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

// 全局付费系统实例
window.PaymentSystem = new PaymentSystem();
window.paymentSystem = window.PaymentSystem;

console.log('💳 Payment module loaded');