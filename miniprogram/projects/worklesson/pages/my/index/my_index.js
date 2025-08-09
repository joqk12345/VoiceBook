/** 
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2020-10-29 07:48:00 
 */

const cacheHelper = require('../../../../../helper/cache_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const AdminBiz = require('../../../../../comm/biz/admin_biz.js');
const WorkBiz = require('../../../biz/work_biz.js');
const setting = require('../../../../../setting/setting.js');
const PassportBiz = require('../../../../../comm/biz/passport_biz.js');

Page({
	data: {
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (PassportBiz.isLogin()) {
			let user = {};
			user.USER_NAME = PassportBiz.getUserName();
			this.setData({ user });
		}

		ProjectBiz.initPage(this);

	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: async function () {
		// 检查是否手动退出状态，如果是则不自动登录
		if (!PassportBiz.isLogoutByUser()) {
			PassportBiz.loginSilenceMust(this);
		}
		this._loadUser();
	},

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () {

	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () {

	},

	_loadUser: async function (e) {
		// 检查是否处于手动退出状态
		if (PassportBiz.isLogoutByUser()) {
			// 用户手动退出，不加载用户信息
			this.setData({
				user: null
			});
			return;
		}

		let opts = {
			title: 'bar'
		}
		let user = await cloudHelper.callCloudData('passport/my_detail', {}, opts);
		if (!user) {
			this.setData({
				user: null
			});
			return;
		}

		this.setData({
			user
		})
	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		// 如果用户手动退出，下拉刷新也不重新加载用户信息
		if (!PassportBiz.isLogoutByUser()) {
			await this._loadUser();
		}
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom: function () {

	},


	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage: function () { },

	url: function (e) {
		pageHelper.url(e, this);
	},

	bindSetTap: function (e, skin) {
		let itemList = ['清除缓存', '后台管理', '老师平台'];
		wx.showActionSheet({
			itemList,
			success: async res => {
				let idx = res.tapIndex;
				if (idx == 0) {
					cacheHelper.clear();
					pageHelper.showNoneToast('清除缓存成功');
				}

				if (idx == 1) {
					if (setting.IS_SUB) {
						AdminBiz.adminLogin(this, 'admin', '123456');
					} else {
						wx.reLaunch({
							url: '../../admin/index/login/admin_login',
						});
					}

				}

				if (idx == 2) {
					if (setting.IS_SUB) {
						WorkBiz.workLogin(this, '13700000000', '123456');
					} else {
						wx.reLaunch({
							url: '../../work/index/login/work_login',
						});
					}

				}

			},
			fail: function (res) { }
		})
	},

	// 退出登录处理
	bindLogoutTap: function (e) {
		wx.showModal({
			title: '确认退出',
			content: '确定要退出当前账户吗？退出后将无法使用个人功能。',
			confirmText: '确定退出',
			cancelText: '取消',
			confirmColor: '#e54d42',
			success: (res) => {
				if (res.confirm) {
					// 执行退出登录
					let result = PassportBiz.logout();
					if (result) {
						// 更新页面状态
						this.setData({
							user: null
						});
						
						// 显示退出成功提示
						pageHelper.showSuccToast('已退出登录', 1500, () => {
							// 刷新页面数据
							this._loadUser();
						});
					}
				}
			}
		});
	},

	// 重新登录处理
	bindReLoginTap: function (e) {
		wx.showModal({
			title: '重新登录',
			content: '是否重新登录以使用完整功能？',
			confirmText: '立即登录',
			cancelText: '取消',
			confirmColor: '#39b54a',
			success: async (res) => {
				if (res.confirm) {
					// 清除退出标记
					PassportBiz.reLogin();
					
					// 显示登录中提示
					pageHelper.showSuccToast('正在登录...', 1000);
					
					// 重新执行登录流程
					setTimeout(async () => {
						await PassportBiz.loginSilenceMust(this);
						this._loadUser();
					}, 500);
				}
			}
		});
	}
})