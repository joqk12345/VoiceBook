/**
 * Notes: 用户管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2022-01-22  07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');

const util = require('../../../../framework/utils/util.js');
const exportUtil = require('../../../../framework/utils/export_util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const UserModel = require('../../model/user_model.js');
const LessonLogModel = require('../../model/lesson_log_model.js');
const AdminHomeService = require('./admin_home_service.js');
const MeetService = require('../meet_service.js');

// 导出用户数据KEY
const EXPORT_USER_DATA_KEY = 'EXPORT_USER_DATA';

class AdminUserService extends BaseProjectAdminService {


	/** 获得某个用户信息 */
	async getUser({
		userId,
		fields = '*'
	}) {
		let where = {
			USER_MINI_OPENID: userId,
		}
		return await UserModel.getOne(where, fields);
	}

	/** 取得用户分页列表 */
	async getUserList({
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
			USER_ADD_TIME: 'desc'
		};
		let fields = '*';

		// 使用简单的查询条件，避免复杂的and/or结构
		let where = {
			_pid: this.getProjectId()
		};

		if (util.isDefined(search) && search) {
			// 简化搜索，使用like操作但避免or结构
			where.USER_NAME = ['like', search];
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					where.USER_STATUS = Number(sortVal);
					where.USER_TYPE = 1;
					break;
				case 'type':
					where.USER_TYPE = Number(sortVal);
					break;
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'USER_ADD_TIME');
					break;
				}
			}
		}
		
		// 添加附加查询条件 - 安全合并
		if (whereEx && typeof whereEx === 'object') {
			// 只添加简单的键值对，避免复杂结构
			for (let key in whereEx) {
				if (typeof whereEx[key] !== 'object' || whereEx[key] === null) {
					where[key] = whereEx[key];
				}
			}
		}
		
		let result = await UserModel.getList(where, fields, orderBy, page, size, true, oldTotal, false);

		// 为导出生成简化的condition参数
		try {
			// 生成简化的condition，只包含基本查询信息
			let simpleCondition = {
				search: search || '',
				sortType: sortType || '',
				sortVal: sortVal || '',
				projectId: this.getProjectId()
			};
			result.condition = encodeURIComponent(JSON.stringify(simpleCondition));
		} catch (e) {
			console.log('生成condition失败:', e);
			result.condition = encodeURIComponent('{}');
		}

		return result;
	}


	async statusUser(id, status, reason) {
		if (!id) this.AppError('ID不能为空');
		let user = await UserModel.getOne({USER_MINI_OPENID: id});
		if (!user) this.AppError('用户不存在');

		let data = {
			USER_STATUS: status,
			USER_EDIT_TIME: timeUtil.time()
		};
		
		// 如果状态是审核未过，增加理由
		if (status == 8 && reason) {
			data.USER_CHECK_REASON = reason;
		}
		
		await UserModel.edit({USER_MINI_OPENID: id}, data);
	}


	/**添加用户 */
	async insertUser(admin, { name, mobile, lessonCnt }) {
		if (!name) this.AppError('请输入用户姓名');
		if (!mobile) this.AppError('请输入用户手机号');
		
		// 检查手机号是否已存在
		let cnt = await UserModel.count({USER_MOBILE: mobile});
		if (cnt > 0) this.AppError('该手机号已存在');
		
		// 对于待注册用户，使用手机号作为临时的USER_MINI_OPENID
		let data = {
			USER_NAME: name,
			USER_MOBILE: mobile,
			USER_MINI_OPENID: mobile, // 使用手机号作为临时openid
			USER_STATUS: 1,
			USER_TYPE: 0, // 0=待注册用户
			USER_LESSON_TOTAL_CNT: lessonCnt || 0,
			USER_LESSON_USED_CNT: 0,
			USER_LESSON_CHECKIN_CNT: 0, // 添加缺失的字段
			USER_LESSON_TIME: timeUtil.time(),
			USER_REG_TIME: 0, // 待注册用户设为0
			USER_ADD_TIME: timeUtil.time(),
			USER_EDIT_TIME: timeUtil.time(),
			_pid: this.getProjectId()
		};
		
		let result = await UserModel.insert(data);
		
		// 只记录课时变动日志，不重复添加课时
		if (lessonCnt > 0) {
			let logData = {
				LESSON_LOG_USER_ID: mobile,
				LESSON_LOG_TYPE: LessonLogModel.TYPE.ADMIN_ADD,
				LESSON_LOG_CHANGE_CNT: lessonCnt,
				LESSON_LOG_MEET_ID: '',
				LESSON_LOG_DESC: '管理员添加待注册用户初始课时',
				LESSON_LOG_LAST_CNT: 0, // 变动前可用课时
				LESSON_LOG_NOW_CNT: lessonCnt, // 变动后可用课时
				LESSON_LOG_ADD_TIME: timeUtil.time(),
				_pid: this.getProjectId()
			};
			
			if (admin) {
				logData.LESSON_LOG_EDIT_ADMIN_ID = admin._id;
				logData.LESSON_LOG_EDIT_ADMIN_NAME = admin.ADMIN_NAME;
				logData.LESSON_LOG_EDIT_ADMIN_TIME = timeUtil.time();
			}
			
			await LessonLogModel.insert(logData);
		}
		
		return result;
	}

	/**删除用户 */
	async delUser(id) {
		if (!id) this.AppError('ID不能为空');
		let user = await UserModel.getOne({USER_MINI_OPENID: id});
		if (!user) this.AppError('用户不存在');
		
		// 删除用户相关数据
		await UserModel.del({USER_MINI_OPENID: id});
		
		// 删除用户相关的课时日志
		await LessonLogModel.del({LESSON_LOG_USER_ID: id});
	}

	// #####################导出用户数据

	/**获取用户数据 */
	async getUserDataURL() {
		return await exportUtil.getExportDataURL(EXPORT_USER_DATA_KEY);
	}

	/**删除用户数据 */
	async deleteUserDataExcel() {
		return await exportUtil.deleteDataExcel(EXPORT_USER_DATA_KEY);
	}

	/**导出用户数据 - 完全重写版本 */
	async exportUserDataExcel(condition, fields) {
		try {
			console.log('=== 开始导出用户数据 ===');
			console.log('输入参数 - condition:', condition);
			console.log('输入参数 - fields:', fields);
			
			// 使用最简单的查询条件，只包含项目ID
			let where = {
				_pid: this.getProjectId()
			};
			
			console.log('基础查询条件:', where);
			
			// 完全忽略复杂的condition参数，使用最安全的查询方式
			console.log('开始查询所有用户数据...');
			
			// 设置要查询的字段
			let queryFields = 'USER_NAME,USER_MOBILE,USER_STATUS,USER_TYPE,USER_LESSON_TOTAL_CNT,USER_LESSON_USED_CNT,USER_LESSON_CHECKIN_CNT,USER_REG_TIME,USER_ADD_TIME';
			
			// 使用最简单的getAll方法，不传入复杂的where条件
			let list = [];
			try {
				list = await UserModel.getAll(where, queryFields, {USER_ADD_TIME: 'desc'}, 1000);
				console.log('成功查询到用户数量:', list.length);
			} catch (dbError) {
				console.error('数据库查询失败:', dbError);
				// 如果查询失败，尝试更简单的方式
				console.log('尝试简化查询...');
				list = await UserModel.getAll({_pid: this.getProjectId()}, 'USER_NAME,USER_MOBILE,USER_STATUS,USER_TYPE', {USER_ADD_TIME: 'desc'}, 100);
				console.log('简化查询成功，用户数量:', list.length);
			}
			
			// 如果还是没有数据，生成一个说明文件
			if (!list || list.length === 0) {
				console.log('没有查询到用户数据，生成说明文件');
				let data = [
					['姓名', '说明'],
					['暂无用户数据', '请检查项目配置或添加用户后再试']
				];
				let title = '用户数据导出（无数据）_' + timeUtil.time('YMD');
				// 修正exportUtil调用参数顺序: (key, title, total, data, options)
				return await exportUtil.exportDataExcel(EXPORT_USER_DATA_KEY, title, data.length, data);
			}
			
			console.log('开始处理用户数据...');
			let data = [];
			
			// 添加表头
			let header = ['姓名', '手机号', '状态', '类型', '总课时', '已约课时', '已核销课时', '剩余课时', '注册时间', '添加时间'];
			data.push(header);
			
			for (let i = 0; i < list.length; i++) {
				let item = list[i];
				let arr = [];
				
				try {
					// 基本信息
					arr.push(item.USER_NAME || '未设置');
					arr.push(item.USER_MOBILE || '未设置');
					
					// 状态转换
					let status = '未知';
					switch(item.USER_STATUS) {
						case 0: status = '待审核'; break;
						case 1: status = '正常'; break;
						case 8: status = '审核未过'; break;
						case 9: status = '禁用'; break;
						default: status = '未知状态(' + item.USER_STATUS + ')'; break;
					}
					arr.push(status);
					
					// 类型转换
					let type = '未知';
					switch(item.USER_TYPE) {
						case 0: type = '待注册'; break;
						case 1: type = '已注册'; break;
						default: type = '未知类型(' + item.USER_TYPE + ')'; break;
					}
					arr.push(type);
					
					// 课时信息 - 使用默认值避免空值
					let totalCnt = Number(item.USER_LESSON_TOTAL_CNT) || 0;
					let usedCnt = Number(item.USER_LESSON_USED_CNT) || 0;
					let checkinCnt = Number(item.USER_LESSON_CHECKIN_CNT) || 0;
					
					arr.push(totalCnt);
					arr.push(usedCnt);
					arr.push(checkinCnt);
					
					// 计算剩余课时
					let remainCnt = totalCnt - checkinCnt;
					arr.push(remainCnt);
					
					// 时间处理 - 安全转换
					let regTime = '未注册';
					if (item.USER_REG_TIME && item.USER_REG_TIME > 0) {
						try {
							regTime = timeUtil.timestamp2Time(item.USER_REG_TIME);
						} catch (e) {
							regTime = '时间转换失败';
						}
					}
					arr.push(regTime);
					
					let addTime = '未知';
					if (item.USER_ADD_TIME && item.USER_ADD_TIME > 0) {
						try {
							addTime = timeUtil.timestamp2Time(item.USER_ADD_TIME);
						} catch (e) {
							addTime = '时间转换失败';
						}
					}
					arr.push(addTime);
					
					data.push(arr);
					
				} catch (itemError) {
					console.error('处理用户数据失败 (索引' + i + '):', itemError);
					// 添加错误行
					let errorArr = ['数据处理失败', item.USER_MOBILE || 'N/A', '错误', '错误', 0, 0, 0, 0, '错误', '错误'];
					data.push(errorArr);
				}
			}
			
			console.log('数据处理完成，准备导出...');
			console.log('处理的数据行数:', data.length);
			
			// 生成导出文件 - 修正参数顺序
			let title = '用户数据导出_' + timeUtil.time('YMD_His');
			// exportUtil.exportDataExcel(key, title, total, data, options)
			let result = await exportUtil.exportDataExcel(EXPORT_USER_DATA_KEY, title, data.length, data);
			console.log('=== 用户数据导出完成 ===');
			return result;
			
		} catch (error) {
			console.error('=== 导出用户数据发生严重错误 ===');
			console.error('错误信息:', error.message);
			console.error('错误堆栈:', error.stack);
			
			// 生成错误报告文件 - 修正参数顺序
			try {
				let errorData = [
					['错误类型', '详细信息'],
					['导出失败', error.message],
					['错误时间', timeUtil.time()],
					['项目ID', this.getProjectId()],
					['建议', '请联系技术支持或重试']
				];
				let errorTitle = '导出错误报告_' + timeUtil.time('YMD_His');
				// exportUtil.exportDataExcel(key, title, total, data, options)
				return await exportUtil.exportDataExcel(EXPORT_USER_DATA_KEY, errorTitle, errorData.length, errorData);
			} catch (exportError) {
				console.error('生成错误报告也失败了:', exportError);
				this.AppError('导出功能完全失败，请联系技术支持');
			}
		}
	}

}

module.exports = AdminUserService;