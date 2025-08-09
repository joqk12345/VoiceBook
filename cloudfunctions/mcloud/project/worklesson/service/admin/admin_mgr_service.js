/**
 * Notes: 管理员管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2021-07-11 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const util = require('../../../../framework/utils/util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const AdminModel = require('../../../../framework/platform/model/admin_model.js');
const LogModel = require('../../../../framework/platform/model/log_model.js');
const md5Lib = require('../../../../framework/lib/md5_lib.js');

class AdminMgrService extends BaseProjectAdminService {

	//**管理员登录  */
	async adminLogin(name, password) {

		// 判断是否存在
		let where = {
			ADMIN_STATUS: 1,
			ADMIN_NAME: name,
			ADMIN_PASSWORD: md5Lib.md5(password)
		}
		let fields = 'ADMIN_ID,ADMIN_NAME,ADMIN_DESC,ADMIN_TYPE,ADMIN_LOGIN_TIME,ADMIN_LOGIN_CNT';
		let admin = await AdminModel.getOne(where, fields);
		if (!admin)
			this.AppError('管理员不存在或者已停用');

		let cnt = admin.ADMIN_LOGIN_CNT;

		// 生成token
		let token = dataUtil.genRandomString(32);
		let tokenTime = timeUtil.time();
		let data = {
			ADMIN_TOKEN: token,
			ADMIN_TOKEN_TIME: tokenTime,
			ADMIN_LOGIN_TIME: timeUtil.time(),
			ADMIN_LOGIN_CNT: cnt + 1
		}
		await AdminModel.edit(where, data);

		let type = admin.ADMIN_TYPE;
		let last = (!admin.ADMIN_LOGIN_TIME) ? '尚未登录' : timeUtil.timestamp2Time(admin.ADMIN_LOGIN_TIME);

		// 写日志
		this.insertLog('登录了系统', admin, LogModel.TYPE.SYS);

		return {
			token,
			name: admin.ADMIN_NAME,
			type,
			last,
			cnt
		}

	}

	async clearLog() {
		// 清理系统日志
		let result = await LogModel.clear();
		return result;
	}

	/** 取得日志分页列表 */
	async getLogList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件 
		page,
		size,
		oldTotal = 0
	}) {

		orderBy = orderBy || {
			LOG_ADD_TIME: 'desc'
		};
		let fields = '*';
		let where = {};

		if (util.isDefined(search) && search) {
			where.or = [{
				LOG_CONTENT: ['like', search]
			}, {
				LOG_ADMIN_DESC: ['like', search]
			}, {
				LOG_ADMIN_NAME: ['like', search]
			}];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'type':
					// 按类型
					where.LOG_TYPE = Number(sortVal);
					break;
			}
		}
		let result = await LogModel.getList(where, fields, orderBy, page, size, true, oldTotal);


		return result;
	}

	/** 获取所有管理员 */
	async getMgrList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		orderBy = {
			ADMIN_ADD_TIME: 'desc'
		}
		let fields = 'ADMIN_NAME,ADMIN_STATUS,ADMIN_PHONE,ADMIN_TYPE,ADMIN_LOGIN_CNT,ADMIN_LOGIN_TIME,ADMIN_DESC,ADMIN_EDIT_TIME,ADMIN_EDIT_IP';

		let where = {};
		where.and = {
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};
		if (util.isDefined(search) && search) {
			where.or = [{
				ADMIN_NAME: ['like', search]
			},
			{
				ADMIN_PHONE: ['like', search]
			},
			{
				ADMIN_DESC: ['like', search]
			}
			];
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					where.and.ADMIN_STATUS = Number(sortVal);
					break;
				case 'type':
					// 按类型
					where.and.ADMIN_TYPE = Number(sortVal);
					break;
			}
		}

		return await AdminModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 删除管理员 */
	async delMgr(id, myAdminId) {
		if (!id) this.AppError('ID不能为空');
		if (id == myAdminId) this.AppError('不能删除自己');

		let mgr = await AdminModel.getOne({_id: id});
		if (!mgr) this.AppError('管理员不存在');

		// 不能删除超级管理员
		if (mgr.ADMIN_TYPE == 1) this.AppError('不能删除超级管理员');

		await AdminModel.del({_id: id});
	}

	/** 添加新的管理员 */
	async insertMgr({
		name,
		desc,
		phone,
		password
	}) {
		if (!name) this.AppError('请输入管理员姓名');
		if (!password) this.AppError('请输入密码');

		// 检查管理员名是否存在
		let cnt = await AdminModel.count({ADMIN_NAME: name});
		if (cnt > 0) this.AppError('该管理员名已存在');

		let data = {
			ADMIN_NAME: name,
			ADMIN_DESC: desc || '',
			ADMIN_PHONE: phone || '',
			ADMIN_PASSWORD: md5Lib.md5(password),
			ADMIN_TYPE: 9, // 普通管理员
			ADMIN_STATUS: 1,
			ADMIN_LOGIN_CNT: 0,
			ADMIN_ADD_TIME: timeUtil.time(),
			ADMIN_EDIT_TIME: timeUtil.time(),
			_pid: this.getProjectId()
		};

		let result = await AdminModel.insert(data);
		return result;
	}

	/** 修改状态 */
	async statusMgr(id, status, myAdminId) {
		if (!id) this.AppError('ID不能为空');
		if (id == myAdminId) this.AppError('不能修改自己的状态');

		let mgr = await AdminModel.getOne({_id: id});
		if (!mgr) this.AppError('管理员不存在');

		// 不能修改超级管理员状态
		if (mgr.ADMIN_TYPE == 1) this.AppError('不能修改超级管理员状态');

		let data = {
			ADMIN_STATUS: status,
			ADMIN_EDIT_TIME: timeUtil.time()
		};
		await AdminModel.edit(id, data);
	} 
 

	/** 获取管理员信息 */
	async getMgrDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let mgr = await AdminModel.getOne(where, fields);
		if (!mgr) return null;

		return mgr;
	}

	/** 修改管理员 */
	async editMgr(id, {
		name,
		desc,
		phone,
		password
	}) {
		if (!id) this.AppError('ID不能为空');
		if (!name) this.AppError('请输入管理员姓名');

		let mgr = await AdminModel.getOne({_id: id});
		if (!mgr) this.AppError('管理员不存在');

		// 检查管理员名是否重复（排除自己）
		let where = {
			ADMIN_NAME: name,
			_id: ['<>', id]
		};
		let cnt = await AdminModel.count(where);
		if (cnt > 0) this.AppError('该管理员名已存在');

		let data = {
			ADMIN_NAME: name,
			ADMIN_DESC: desc || '',
			ADMIN_PHONE: phone || '',
			ADMIN_EDIT_TIME: timeUtil.time()
		};

		// 如果提供了密码，则更新密码
		if (password) {
			data.ADMIN_PASSWORD = md5Lib.md5(password);
		}

		await AdminModel.edit(id, data);
	}

	/** 修改自身密码 */
	async pwdtMgr(adminId, oldPassword, password) {
		if (!adminId) this.AppError('ID不能为空');
		if (!oldPassword) this.AppError('请输入原密码');
		if (!password) this.AppError('请输入新密码');

		// 验证原密码
		let admin = await AdminModel.getOne({
			_id: adminId,
			ADMIN_PASSWORD: md5Lib.md5(oldPassword)
		});
		if (!admin) this.AppError('原密码错误');

		let data = {
			ADMIN_PASSWORD: md5Lib.md5(password),
			ADMIN_EDIT_TIME: timeUtil.time()
		};
		await AdminModel.edit(adminId, data);
	}
}

module.exports = AdminMgrService;