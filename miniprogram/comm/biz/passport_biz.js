/**
 * Notes: 注册登录模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2020-11-14 07:48:00 
 */

const BaseBiz = require('./base_biz.js');
const cacheHelper = require('../../helper/cache_helper.js');
const cloudHelper = require('../../helper/cloud_helper.js');
const pageHelper = require('../../helper/page_helper.js');
const helper = require('../../helper/helper.js');
const constants = require('../constants.js');

class PassportBiz extends BaseBiz {

	// 静默登录(有登录状态则不登录)  
	static async loginSilence(that) {
		return await PassportBiz.loginCheck(false, 'slience', 'bar', that);
	}

	// 强制静默登录(有不论是否有登录状态)  
	static async loginSilenceMust(that) {
		return await PassportBiz.loginCheck(false, 'must', 'bar', that);
	}

	// 必须登陆 可以取消(窗口形式) 
	static async loginMustCancelWin(that) {
		return await PassportBiz.loginCheck(true, 'cancel', '', that);
	}

	// 必须登陆 只能强制注册或者回上页(窗口形式)  
	static async loginMustBackWin(that) {
		return await PassportBiz.loginCheck(true, 'back', '', that);
	}

	// 获取token  
	static getToken() {
		let token = cacheHelper.get(constants.CACHE_TOKEN);
		return token || null;
	}

	// 设置token
	static setToken(token) {
		if (!token) return;
		cacheHelper.set(constants.CACHE_TOKEN, token, constants.CACHE_TOKEN_EXPIRE);
	}

	//  获取user id 
	static getUserId() {
		let token = cacheHelper.get(constants.CACHE_TOKEN);
		if (!token) return '';
		return token.id || '';
	}

	// 获取user name 
	static getUserName() {
		let token = cacheHelper.get(constants.CACHE_TOKEN);
		if (!token) return '';
		return token.name || '';
	}

	static getStatus() {
		let token = cacheHelper.get(constants.CACHE_TOKEN);
		if (!token) return -1;
		return token.status || -1;
	}

	// 是否登录 
	static isLogin() {
		let id = PassportBiz.getUserId();
		return (id.length > 0) ? true : false;
	}

	// 检查是否手动退出状态
	static isLogoutByUser() {
		return cacheHelper.get(constants.CACHE_USER_LOGOUT) === true;
	}

	// 设置手动退出状态
	static setLogoutByUser(isLogout = true) {
		if (isLogout) {
			cacheHelper.set(constants.CACHE_USER_LOGOUT, true, 86400); // 24小时有效
		} else {
			cacheHelper.remove(constants.CACHE_USER_LOGOUT);
		}
	}

	static loginStatusHandler(method, status) {
		let content = '';
		if (status == 0) content = '您的注册正在审核中，暂时无法使用此功能！';
		else if (status == 8) content = '您的注册审核未通过，暂时无法使用此功能；请在个人中心修改资料，再次提交审核！';
		else if (status == 9) content = '您的账号已经禁用, 无法使用此功能！';
		if (method == 'cancel') {
			wx.showModal({
				title: '温馨提示',
				content,
				confirmText: '取消',
				showCancel: false
			});
		}
		else if (method == 'back') {
			wx.showModal({
				title: '温馨提示',
				content,
				confirmText: '返回',
				showCancel: false,
				success(result) {
					wx.navigateBack();
				}
			});
		}
		return false;
	}

	// 登录判断及处理
	static async loginCheck(mustLogin = false, method = 'back', title = '', that = null) {
		// 检查是否处于手动退出状态
		if (PassportBiz.isLogoutByUser()) {
			// 用户手动退出
			if (that) {
				that.setData({
					isLogin: false
				});
			}
			
			// 如果是必须登录的页面，引导用户重新登录
			if (mustLogin) {
				if (method == 'cancel') {
					wx.showModal({
						title: '需要重新登录',
						content: '您已退出登录，请重新登录以使用此功能',
						confirmText: '重新登录',
						cancelText: '取消',
						success(result) {
							if (result.confirm) {
								// 清除退出状态并引导到个人中心
								PassportBiz.reLogin();
								let url = pageHelper.fmtURLByPID('/pages/my/index/my_index');
								wx.navigateTo({ url });
							}
						}
					});
				} else if (method == 'back') {
					wx.showModal({
						title: '需要重新登录',
						content: '您已退出登录，请重新登录以使用此功能',
						confirmText: '重新登录',
						cancelText: '返回',
						success(result) {
							if (result.confirm) {
								// 清除退出状态并引导到个人中心
								PassportBiz.reLogin();
								let url = pageHelper.fmtURLByPID('/pages/my/index/my_index');
								wx.redirectTo({ url });
							} else if (result.cancel) {
								let len = getCurrentPages().length;
								if (len == 1) {
									let url = pageHelper.fmtURLByPID('/pages/default/index/default_index');
									wx.reLaunch({ url });
								} else {
									wx.navigateBack();
								}
							}
						}
					});
				}
				return false;
			}
			
			// 对于非强制登录的页面，只是标记未登录状态
			return false;
		}

		let token = cacheHelper.get(constants.CACHE_TOKEN);
		if (token && method != 'must') {
			if (that)
				that.setData({
					isLogin: true
				});
			return true;
		} else {
			if (that) that.setData({
				isLogin: false
			});
		}

		let opt = {
			title: title || '登录中',
		};

		let res = await cloudHelper.callCloudSumbit('passport/login', {}, opt).then(result => {
			PassportBiz.clearToken();
			if (result && helper.isDefined(result.data.token) && result.data.token && result.data.token.status == 1) {
				PassportBiz.setToken(result.data.token);

				if (that) that.setData({
					isLogin: true
				});

				return true;
			}
			else if (mustLogin && result && helper.isDefined(result.data.token) && result.data.token && (result.data.token.status == 0 || result.data.token.status == 8 || result.data.token.status == 9)) {
				let status = result.data.token.status;
				return PassportBiz.loginStatusHandler(method, status);
			}
			else if (mustLogin && method == 'cancel') {
				wx.showModal({
					title: '温馨提示',
					content: '此功能仅限注册用户',
					confirmText: '马上注册',
					cancelText: '取消',
					success(result) {
						if (result.confirm) {
							let url = pageHelper.fmtURLByPID('/pages/my/reg/my_reg') + '?retUrl=back';
							wx.navigateTo({ url });

						} else if (result.cancel) {

						}
					}
				});

				return false;
			}
			else if (mustLogin && method == 'back') {
				wx.showModal({
					title: '温馨提示',
					content: '此功能仅限注册用户',
					confirmText: '马上注册',
					cancelText: '返回',
					success(result) {
						if (result.confirm) {
							let retUrl = encodeURIComponent(pageHelper.getCurrentPageUrlWithArgs());
							let url = pageHelper.fmtURLByPID('/pages/my/reg/my_reg') + '?retUrl=' + retUrl;
							wx.redirectTo({ url });
						} else if (result.cancel) {
							let len = getCurrentPages().length;
							if (len == 1) {
								let url = pageHelper.fmtURLByPID('/pages/default/index/default_index');
								wx.reLaunch({ url });
							}
							else
								wx.navigateBack();

						}
					}
				});

				return false;
			}
			else if (mustLogin && method == 'back') {
				wx.showModal({
					title: '温馨提示',
					content: '此功能仅限注册用户',
					confirmText: '马上注册',
					cancelText: '返回',
					success(result) {
						if (result.confirm) {
							let url = pageHelper.fmtURLByPID('/pages/my/reg/my_reg');
							wx.reLaunch({ url });
						} else if (result.cancel) {
							wx.navigateBack();
						}
					}
				});

				return false;
			}

		}).catch(err => {
			console.log(err);
			PassportBiz.clearToken();
			return false;
		});

		return res;
	}

	// 清除登录缓存
	static clearToken() {
		cacheHelper.remove(constants.CACHE_TOKEN);
	}

	// 退出登录
	static logout() {
		PassportBiz.clearToken();
		// 设置手动退出标记，阻止自动登录
		PassportBiz.setLogoutByUser(true);
		// 清除其他可能的用户相关缓存
		cacheHelper.remove('user-detail');
		cacheHelper.remove('my-join-list');
		cacheHelper.remove('my-fav');
		cacheHelper.remove('my-foot');
		return true;
	}

	// 重新登录（清除退出标记）
	static reLogin() {
		PassportBiz.setLogoutByUser(false);
		return true;
	}

	// 手机号码
	static async getPhone(e, that) {
		if (e.detail.errMsg == "getPhoneNumber:ok") {

			let cloudID = e.detail.cloudID;
			let params = {
				cloudID
			};
			let opt = {
				title: '手机验证中'
			};
			await cloudHelper.callCloudSumbit('passport/phone', params, opt).then(res => {
				let phone = res.data;
				if (!phone || phone.length < 11)
					wx.showToast({
						title: '手机号码获取失败，请重新填写手机号码',
						icon: 'none',
						duration: 2000
					});
				else {
					that.setData({
						formMobile: phone
					});
				}
			});
		} else
			wx.showToast({
				title: '手机号码获取失败，请重新填写手机号码',
				icon: 'none'
			});
	}
}



/** 表单校验    */
PassportBiz.CHECK_FORM = {
	name: 'formName|must|string|min:1|max:30|name=昵称',
	mobile: 'formMobile|must|len:11|name=手机',
	forms: 'formForms|array'
};


module.exports = PassportBiz;