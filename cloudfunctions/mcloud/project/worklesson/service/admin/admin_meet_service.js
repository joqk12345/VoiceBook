/**
 * Notes: 预约后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2021-12-08 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const MeetService = require('../meet_service.js');
const AdminHomeService = require('../admin/admin_home_service.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const setupUtil = require('../../../../framework/utils/setup/setup_util.js');
const util = require('../../../../framework/utils/util.js');
const cloudUtil = require('../../../../framework/cloud/cloud_util.js');
const cloudBase = require('../../../../framework/cloud/cloud_base.js');
const md5Lib = require('../../../../framework/lib/md5_lib.js');


const MeetModel = require('../../model/meet_model.js');
const JoinModel = require('../../model/join_model.js');
const LessonLogModel = require('../../model/lesson_log_model.js');
const DayModel = require('../../model/day_model.js');
const TempModel = require('../../model/temp_model.js');

const exportUtil = require('../../../../framework/utils/export_util.js');


// 导出报名数据KEY
const EXPORT_JOIN_DATA_KEY = 'EXPORT_JOIN_DATA';

class AdminMeetService extends BaseProjectAdminService {

	/** 推荐首页SETUP */
	async vouchMeetSetup(id, vouch) {
		if (!id) this.AppError('ID不能为空');
		let meet = await MeetModel.getOne({_id: id});
		if (!meet) this.AppError('预约项目不存在');

		let data = {
			MEET_VOUCH: vouch
		};
		await MeetModel.edit(id, data);
	}


	/** 预约数据列表 */
	async getDayList(meetId, start, end) {
		let where = {
			DAY_MEET_ID: meetId,
			day: ['between', start, end]
		}
		let orderBy = {
			day: 'asc'
		}
		return await DayModel.getAllBig(where, 'day,times,dayDesc', orderBy);
	}

	// 按项目统计人数
	async statJoinCntByMeet(meetId) {
		if (!meetId) this.AppError('ID不能为空');
		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		let cnt = await JoinModel.count(where);
		return { cnt };
	}


	/** 管理员按钮核销 */
	async checkinJoin(joinId, flag) {
		if (!joinId) this.AppError('ID不能为空');
		let join = await JoinModel.getOne({_id: joinId});
		if (!join) this.AppError('预约记录不存在');

		if (join.JOIN_STATUS != JoinModel.STATUS.SUCC) 
			this.AppError('该预约状态不能核销');

		// 检查是否已经核销过
		if (flag && join.JOIN_IS_CHECKIN == 1) {
			this.AppError('该预约已经核销过了');
		}

		let data = {
			JOIN_IS_CHECKIN: flag ? 1 : 0,
			JOIN_CHECKIN_TIME: flag ? timeUtil.time() : 0
		};
		await JoinModel.edit(joinId, data);

		// 核销/取消核销时处理已核销课时数
		const MeetService = require('../meet_service.js');
		let meetService = new MeetService();
		
		if (flag && join.JOIN_IS_CHECKIN != 1) {
			// 核销：增加已核销课时数
			await meetService.checkinUserMeetLesson(null, join.JOIN_USER_ID, 1, LessonLogModel.TYPE.USER_APPT, join.JOIN_MEET_ID, '核销《' + join.JOIN_MEET_TITLE + '》');
		} else if (!flag && join.JOIN_IS_CHECKIN == 1) {
			// 取消核销：减少已核销课时数
			await meetService.uncheckinUserMeetLesson(null, join.JOIN_USER_ID, 1, LessonLogModel.TYPE.ADMIN_RECOVER, join.JOIN_MEET_ID, '取消核销《' + join.JOIN_MEET_TITLE + '》');
		}
	}

	/** 管理员扫码核销 */
	async scanJoin(meetId, code) {
		if (!meetId) this.AppError('ID不能为空');
		if (!code) this.AppError('扫码内容不能为空');

		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_CODE: code,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		let join = await JoinModel.getOne(where);
		if (!join) this.AppError('预约记录不存在或状态不正确');

		if (join.JOIN_IS_CHECKIN == 1) 
			this.AppError('该预约已经核销过了');

		let data = {
			JOIN_IS_CHECKIN: 1,
			JOIN_CHECKIN_TIME: timeUtil.time()
		};
		await JoinModel.edit(join._id, data);

		// 核销时增加已核销课时数
		const MeetService = require('../meet_service.js');
		let meetService = new MeetService();
		await meetService.checkinUserMeetLesson(null, join.JOIN_USER_ID, 1, LessonLogModel.TYPE.USER_APPT, join.JOIN_MEET_ID, '扫码核销《' + join.JOIN_MEET_TITLE + '》');

		return join;
	}

	/**
	 * 判断本日是否有预约记录
	 * @param {*} daySet daysSet的节点
	 */
	checkHasJoinCnt(times) {
		if (!times || !Array.isArray(times)) return false;
		for (let time of times) {
			if (time.cnt && time.cnt > 0) return true;
		}
		return false;
	}

	// 判断含有预约的日期
	getCanModifyDaysSet(daysSet) {
		if (!daysSet || !Array.isArray(daysSet)) return [];
		let canModifyDays = [];
		for (let day of daysSet) {
			if (!this.checkHasJoinCnt(day.times)) {
				canModifyDays.push(day.day);
			}
		}
		return canModifyDays;
	}

	// 更新forms信息
	async updateMeetForms({
		id,
		hasImageForms
	}) {
		if (!id) this.AppError('ID不能为空');
		let meet = await MeetModel.getOne({_id: id});
		if (!meet) this.AppError('预约项目不存在');

		let data = {
			MEET_FORMS: hasImageForms || [],
			MEET_EDIT_TIME: timeUtil.time()
		};
		await MeetModel.edit(id, data);
	}


	/**添加 */
	async insertMeet(adminId, {
		title,
		order,
		cancelSet,
		cateId,
		cateName,
		daysSet,
		phone,
		password,
		forms,
		joinForms,
	}) {
		if (!title) this.AppError('请输入标题');
		if (!cateId) this.AppError('请选择分类');
		if (!cateName) this.AppError('请选择分类');

		let data = {
			MEET_TITLE: title,
			MEET_ORDER: order || 9999,
			MEET_CANCEL_SET: cancelSet || 1,
			MEET_CATE_ID: cateId,
			MEET_CATE_NAME: cateName,
			MEET_FORMS: forms || [],
			MEET_JOIN_FORMS: joinForms || [],
			MEET_STATUS: 1,
			MEET_ADD_TIME: timeUtil.time(),
			MEET_EDIT_TIME: timeUtil.time(),
			_pid: this.getProjectId()
		};

		if (phone) data.MEET_PHONE = phone;
		if (password) data.MEET_PASSWORD = md5Lib.md5(password);

		let result = await MeetModel.insert(data);
		let meetId = result._id;

		// 设置日期排期
		if (daysSet && daysSet.length > 0) {
			await this.setDays(meetId, { daysSet });
		}

		return result;
	}


	/**排期设置 */
	async setDays(id, {
		daysSet,
	}) {
		if (!id) this.AppError('ID不能为空');
		let meet = await MeetModel.getOne({_id: id});
		if (!meet) this.AppError('预约项目不存在');

		// 删除原有的日期数据
		await DayModel.del({DAY_MEET_ID: id});

		// 插入新的日期数据
		if (daysSet && Array.isArray(daysSet)) {
			for (let dayData of daysSet) {
				let data = {
					DAY_MEET_ID: id,
					day: dayData.day,
					times: dayData.times || [],
					dayDesc: dayData.dayDesc || '',
					_pid: this.getProjectId()
				};
				await DayModel.insert(data);
			}
		}

		// 更新预约项目的MEET_DAYS字段
		let days = daysSet ? daysSet.map(item => item.day) : [];
		await MeetModel.edit(id, {
			MEET_DAYS: days,
			MEET_EDIT_TIME: timeUtil.time()
		});
	}


	/**删除数据 */
	async delMeet(id) {
		let where = {
			_id: id
		}

		if (!id) this.AppError('ID不能为空');
		let meet = await MeetModel.getOne(where);
		if (!meet) this.AppError('预约项目不存在');

		// 删除相关的预约记录
		await JoinModel.del({JOIN_MEET_ID: id});

		// 删除相关的日期数据
		await DayModel.del({DAY_MEET_ID: id});

		// 删除相关的模板数据
		await TempModel.del({TEMP_MEET_ID: id});

		// 删除预约项目
		await MeetModel.del(where);
	}

	/**获取信息 */
	async getMeetDetail(id) {
		if (!id) this.AppError('ID不能为空');
		let fields = '*';

		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where, fields);
		if (!meet) return null;

		let meetService = new MeetService();
		meet.MEET_DAYS_SET = await meetService.getDaysSet(id, timeUtil.time('Y-M-D')); //今天及以后

		return meet;
	}


	/** 更新日期设置 */
	async _editDays(meetId, nowDay, daysSetData) {
		if (!meetId) this.AppError('ID不能为空');
		let meet = await MeetModel.getOne({_id: meetId});
		if (!meet) this.AppError('预约项目不存在');

		// 删除指定日期的数据
		await DayModel.del({DAY_MEET_ID: meetId, day: nowDay});

		// 插入新的日期数据
		if (daysSetData) {
			let data = {
				DAY_MEET_ID: meetId,
				day: nowDay,
				times: daysSetData.times || [],
				dayDesc: daysSetData.dayDesc || '',
				_pid: this.getProjectId()
			};
			await DayModel.insert(data);
		}

		// 更新预约项目的编辑时间
		await MeetModel.edit(meetId, {
			MEET_EDIT_TIME: timeUtil.time()
		});
	}

	/**更新数据 */
	async editMeet({
		id,
		title,
		cateId,
		cateName,
		order,
		cancelSet,
		daysSet,
		phone,
		password,
		forms,
		joinForms
	}) {
		if (!id) this.AppError('ID不能为空');
		if (!title) this.AppError('请输入标题');
		if (!cateId) this.AppError('请选择分类');
		if (!cateName) this.AppError('请选择分类');

		let meet = await MeetModel.getOne({_id: id});
		if (!meet) this.AppError('预约项目不存在');

		let data = {
			MEET_TITLE: title,
			MEET_CATE_ID: cateId,
			MEET_CATE_NAME: cateName,
			MEET_ORDER: order || 9999,
			MEET_CANCEL_SET: cancelSet || 1,
			MEET_FORMS: forms || [],
			MEET_JOIN_FORMS: joinForms || [],
			MEET_EDIT_TIME: timeUtil.time()
		};

		if (phone) data.MEET_PHONE = phone;
		if (password) data.MEET_PASSWORD = md5Lib.md5(password);

		await MeetModel.edit(id, data);

		// 更新日期排期
		if (daysSet && daysSet.length > 0) {
			await this.setDays(id, { daysSet });
		}
	}

	/**预约名单分页列表 */
	async getJoinList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		meetId,
		mark,
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'JOIN_ADD_TIME': 'desc'
		};
		let fields = 'JOIN_IS_CHECKIN,JOIN_CHECKIN_TIME,JOIN_CODE,JOIN_ID,JOIN_REASON,JOIN_USER_ID,JOIN_MEET_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_MEET_TIME_MARK,JOIN_FORMS,JOIN_STATUS,JOIN_ADD_TIME';

		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: mark
		};
		if (util.isDefined(search) && search) {
			where['JOIN_FORMS.val'] = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					sortVal = Number(sortVal);
					if (sortVal == 1099) //取消的2种
						where.JOIN_STATUS = ['in', [10, 99]]
					else
						where.JOIN_STATUS = Number(sortVal);
					break;
				case 'checkin':
					// 核销
					where.JOIN_STATUS = JoinModel.STATUS.SUCC;
					if (sortVal == 1) {
						where.JOIN_IS_CHECKIN = 1;
					} else {
						where.JOIN_IS_CHECKIN = 0;
					}
					break;
			}
		}

		return await JoinModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**预约项目分页列表 */
	async getAdminMeetList({
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

		orderBy = orderBy || {
			'MEET_ORDER': 'asc',
			'MEET_ADD_TIME': 'desc'
		};
		let fields = 'MEET_CATE_ID,MEET_CATE_NAME,MEET_TITLE,MEET_STATUS,MEET_DAYS,MEET_ADD_TIME,MEET_EDIT_TIME,MEET_ORDER,MEET_VOUCH,MEET_QR';

		let where = {};
		if (util.isDefined(search) && search) {
			where.MEET_TITLE = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					where.MEET_STATUS = Number(sortVal);
					break;
				case 'cateId':
					// 按类型
					where.MEET_CATE_ID = sortVal;
					break;
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'MEET_VIEW_CNT': 'desc',
							'MEET_ADD_TIME': 'desc'
						};
					}

					break;
			}
		}

		return await MeetModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 删除 */
	async delJoin(joinId) {
		if (!joinId) this.AppError('ID不能为空');
		let join = await JoinModel.getOne({_id: joinId});
		if (!join) this.AppError('预约记录不存在');

		await JoinModel.del({_id: joinId});
	}

	/**修改报名状态 
	 * 特殊约定 99=>正常取消 
	 */
	async statusJoin(joinId, status, reason = '') {
		if (!joinId) this.AppError('ID不能为空');
		let join = await JoinModel.getOne({_id: joinId});
		if (!join) this.AppError('预约记录不存在');

		let data = {
			JOIN_STATUS: status,
			JOIN_EDIT_TIME: timeUtil.time()
		};
		if (reason) data.JOIN_REASON = reason;
		await JoinModel.edit(joinId, data);
	}

	/**修改项目状态 */
	async statusMeet(id, status) {
		if (!id) this.AppError('ID不能为空');
		let meet = await MeetModel.getOne({_id: id});
		if (!meet) this.AppError('预约项目不存在');

		let data = {
			MEET_STATUS: status,
			MEET_EDIT_TIME: timeUtil.time()
		};
		await MeetModel.edit(id, data);
	}

	/**置顶排序设定 */
	async sortMeet(id, sort) {
		if (!id) this.AppError('ID不能为空');
		let meet = await MeetModel.getOne({_id: id});
		if (!meet) this.AppError('预约项目不存在');

		let data = {
			MEET_ORDER: sort,
			MEET_EDIT_TIME: timeUtil.time()
		};
		await MeetModel.edit(id, data);
	}

	/**首页设定 */
	async vouchMeet(id, vouch) {
		if (!id) this.AppError('ID不能为空');
		let meet = await MeetModel.getOne({_id: id});
		if (!meet) this.AppError('预约项目不存在');

		let data = {
			MEET_VOUCH: vouch,
			MEET_EDIT_TIME: timeUtil.time()
		};
		await MeetModel.edit(id, data);
	}

	//##################模板
	/**添加模板 */
	async insertMeetTemp({
		name,
		times,
	}, meetId = 'admin') {
		if (!name) this.AppError('请输入模板名称');
		if (!times) this.AppError('请设置时间段');

		// 检查模板名称是否已存在
		let cnt = await TempModel.count({
			TEMP_MEET_ID: meetId,
			TEMP_NAME: name
		});
		if (cnt > 0) this.AppError('该模板名称已存在');

		let data = {
			TEMP_MEET_ID: meetId,
			TEMP_NAME: name,
			TEMP_TIMES: times || [],
			TEMP_ADD_TIME: timeUtil.time(),
			TEMP_EDIT_TIME: timeUtil.time(),
			_pid: this.getProjectId()
		};

		let result = await TempModel.insert(data);
		return result;
	}

	/**更新数据 */
	async editMeetTemp({
		id,
		limit,
		isLimit
	}, meetId = 'admin') {
		if (!id) this.AppError('ID不能为空');
		let temp = await TempModel.getOne({_id: id, TEMP_MEET_ID: meetId});
		if (!temp) this.AppError('模板不存在');

		let data = {
			TEMP_EDIT_TIME: timeUtil.time()
		};

		if (util.isDefined(limit)) {
			// 更新模板中所有时间段的限制
			let times = temp.TEMP_TIMES || [];
			times.forEach(time => {
				time.limit = limit;
				time.isLimit = isLimit;
			});
			data.TEMP_TIMES = times;
		}

		await TempModel.edit(id, data);
	}


	/**删除数据 */
	async delMeetTemp(id, meetId = 'admin') {
		if (!id) this.AppError('ID不能为空');
		let temp = await TempModel.getOne({_id: id, TEMP_MEET_ID: meetId});
		if (!temp) this.AppError('模板不存在');

		await TempModel.del({_id: id});
	}


	/**模板列表 */
	async getMeetTempList(meetId = 'admin') {
		let orderBy = {
			'TEMP_ADD_TIME': 'desc'
		};
		let fields = 'TEMP_NAME,TEMP_TIMES';

		let where = {
			TEMP_MEET_ID: meetId
		};
		return await TempModel.getAll(where, fields, orderBy);
	}

	// #####################导出报名数据
	/**获取报名数据 */
	async getJoinDataURL() {
		return await exportUtil.getExportDataURL(EXPORT_JOIN_DATA_KEY);
	}

	/**删除报名数据 */
	async deleteJoinDataExcel() {
		return await exportUtil.deleteDataExcel(EXPORT_JOIN_DATA_KEY);
	}

	/**导出报名数据 */
	async exportJoinDataExcel(condition, fields) {
		try {
			console.log('导出报名数据 - condition:', condition);
			
			// 解析条件参数
			let meetId, startDay, endDay, status;
			
			if (condition && condition !== '{}') {
				try {
					// 尝试从condition字符串中解析参数
					if (typeof condition === 'string') {
						let conditionObj = JSON.parse(decodeURIComponent(condition));
						console.log('解析后的条件:', conditionObj);
						
						// 从条件中提取参数
						if (conditionObj.and) {
							meetId = conditionObj.and.JOIN_MEET_ID;
							status = conditionObj.and.JOIN_STATUS;
						}
						
						// 如果没有指定日期范围，使用当前月份
						if (!startDay || !endDay) {
							let now = new Date();
							let year = now.getFullYear();
							let month = (now.getMonth() + 1).toString().padStart(2, '0');
							startDay = `${year}-${month}-01`;
							endDay = `${year}-${month}-31`;
						}
					} else if (typeof condition === 'object') {
						// 直接传入对象的情况
						meetId = condition.meetId || condition.JOIN_MEET_ID;
						startDay = condition.startDay;
						endDay = condition.endDay;
						status = condition.status || condition.JOIN_STATUS;
					}
				} catch (e) {
					console.log('解析条件失败:', e);
				}
			}
			
			// 如果还是没有必要参数，返回错误提示
			if (!meetId) {
				console.log('导出参数不完整，meetId为空');
				// 生成一个空的导出文件，提示参数不完整
				let data = [
					['错误信息', '解决方案'],
					['参数不完整', '请在预约管理页面选择具体的预约项目后再导出']
				];
				let title = '导出参数错误_' + timeUtil.time('YMD');
				// 修正exportUtil调用参数顺序: (key, title, total, data, options)
				return await exportUtil.exportDataExcel(EXPORT_JOIN_DATA_KEY, title, data.length, data);
			}
			
			if (!startDay) startDay = '2020-01-01';
			if (!endDay) endDay = '2030-12-31';
			
			console.log('最终导出参数:', { meetId, startDay, endDay, status });
			
			// 使用最简单的查询条件，避免所有复杂操作符
			let where = {
				JOIN_MEET_ID: meetId
			};

			// 只添加简单的等值查询
			if (util.isDefined(status) && status !== '') {
				where.JOIN_STATUS = Number(status);
			}
			
			console.log('查询条件where:', where);

			let exportFields = 'JOIN_ID,JOIN_CODE,JOIN_USER_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_MEET_TIME_MARK,JOIN_FORMS,JOIN_STATUS,JOIN_IS_CHECKIN,JOIN_CHECKIN_TIME,JOIN_ADD_TIME';
			let list = await JoinModel.getAll(where, exportFields, {JOIN_ADD_TIME: 'desc'});
			console.log('查询结果数量:', list.length);
			
			// 在代码中过滤日期范围，避免数据库查询中的复杂条件
			if (startDay && endDay && startDay !== '2020-01-01' && endDay !== '2030-12-31') {
				list = list.filter(item => {
					return item.JOIN_MEET_DAY >= startDay && item.JOIN_MEET_DAY <= endDay;
				});
				console.log('日期过滤后数量:', list.length);
			}

			let data = [];
			for (let k = 0; k < list.length; k++) {
				let item = list[k];
				let arr = [];

				arr.push(item.JOIN_CODE || '');
				arr.push(item.JOIN_MEET_TITLE || '');
				arr.push(item.JOIN_MEET_DAY || '');
				arr.push(item.JOIN_MEET_TIME_START + '-' + item.JOIN_MEET_TIME_END);

				// 提取表单数据
				let forms = item.JOIN_FORMS || [];
				let name = '';
				let phone = '';
				for (let form of forms) {
					if (form.mark === 'name') name = form.val;
					if (form.mark === 'phone') phone = form.val;
				}
				arr.push(name);
				arr.push(phone);

				let statusDesc = '未知';
				if (item.JOIN_STATUS == 1) statusDesc = '正常';
				else if (item.JOIN_STATUS == 10) statusDesc = '用户取消';
				else if (item.JOIN_STATUS == 99) statusDesc = '管理员取消';
				arr.push(statusDesc);

				let checkin = item.JOIN_IS_CHECKIN == 1 ? '已核销' : '未核销';
				arr.push(checkin);

				if (item.JOIN_CHECKIN_TIME) {
					arr.push(timeUtil.timestamp2Time(item.JOIN_CHECKIN_TIME));
				} else {
					arr.push('');
				}

				arr.push(timeUtil.timestamp2Time(item.JOIN_ADD_TIME));

				data.push(arr);
			}

			let title = '报名数据导出_' + timeUtil.time('YMD');
			let header = ['预约码', '预约项目', '预约日期', '预约时间', '姓名', '手机号', '状态', '核销状态', '核销时间', '预约时间'];

			// 添加表头到数据开头
			data.unshift(header);

			// 修正exportUtil调用参数顺序: (key, title, total, data, options)
			return await exportUtil.exportDataExcel(EXPORT_JOIN_DATA_KEY, title, data.length, data);
			
		} catch (error) {
			console.error('导出报名数据失败:', error);
			console.error('错误堆栈:', error.stack);
			this.AppError('导出数据失败: ' + error.message);
		}
	}

	// ###################### 导出老师课时统计 BEGIN ######################
	/**获取老师课时数据 */
	async getTeacherDataURL() {
		return await exportUtil.getExportDataURL('EXPORT_TEACHER_DATA');
	}

	/**删除老师课时数据 */
	async deleteTeacherDataExcel() {
		return await exportUtil.deleteDataExcel('EXPORT_TEACHER_DATA');
	}

	/**导出老师课时统计数据 */
	async exportTeacherDataExcel(condition, fields) {
		try {
			console.log('导出老师课时统计 - condition:', condition);
			
			// 简单的查询条件
			let where = {
				_pid: this.getProjectId()
			};
			
			// 如果有条件参数，尝试解析
			if (condition && condition !== '{}') {
				try {
					let conditionObj = JSON.parse(decodeURIComponent(condition));
					console.log('解析后的条件:', conditionObj);
					
					// 提取简单条件
					if (conditionObj.and) {
						Object.assign(where, conditionObj.and);
					}
				} catch (e) {
					console.log('解析条件失败:', e);
				}
			}
			
			console.log('查询老师where条件:', where);

			// 获取所有老师
			let teacherFields = 'MEET_ID,MEET_TITLE,MEET_PHONE,MEET_STATUS,MEET_ADD_TIME,MEET_LOGIN_CNT,MEET_LOGIN_TIME';
			let teachers = await MeetModel.getAll(where, teacherFields, {MEET_ADD_TIME: 'desc'});
			console.log('查询到老师数量:', teachers.length);

			let data = [];
			for (let teacher of teachers) {
				let arr = [];
				
				// 老师基本信息
				arr.push(teacher.MEET_TITLE || ''); // 老师姓名
				arr.push(teacher.MEET_PHONE || ''); // 手机号
				
				// 状态转换
				let status = '未知';
				if (teacher.MEET_STATUS == 0) status = '未启用';
				else if (teacher.MEET_STATUS == 1) status = '使用中';
				else if (teacher.MEET_STATUS == 9) status = '停止预约';
				else if (teacher.MEET_STATUS == 10) status = '已关闭';
				arr.push(status);
				
				// 统计该老师的课时数据
				let joinWhere = {
					JOIN_MEET_ID: teacher._id,
					_pid: this.getProjectId()
				};
				
				// 总预约次数
				let totalJoins = await JoinModel.count(joinWhere);
				arr.push(totalJoins);
				
				// 已核销次数
				let checkedJoins = await JoinModel.count({
					...joinWhere,
					JOIN_IS_CHECKIN: 1
				});
				arr.push(checkedJoins);
				
				// 取消预约次数
				let cancelledJoins = await JoinModel.count({
					...joinWhere,
					JOIN_STATUS: 10 // 用户取消
				});
				arr.push(cancelledJoins);
				
				// 登录次数
				arr.push(teacher.MEET_LOGIN_CNT || 0);
				
				// 最近登录时间
				let lastLogin = '未登录';
				if (teacher.MEET_LOGIN_TIME && teacher.MEET_LOGIN_TIME > 0) {
					try {
						lastLogin = timeUtil.timestamp2Time(teacher.MEET_LOGIN_TIME);
					} catch (e) {
						lastLogin = '时间格式错误';
					}
				}
				arr.push(lastLogin);
				
				// 添加时间
				let addTime = '未知';
				if (teacher.MEET_ADD_TIME) {
					try {
						addTime = timeUtil.timestamp2Time(teacher.MEET_ADD_TIME);
					} catch (e) {
						addTime = '时间格式错误';
					}
				}
				arr.push(addTime);
				
				data.push(arr);
			}

			let title = '老师课时统计导出_' + timeUtil.time('YMD');
			let header = ['老师姓名', '手机号', '状态', '总预约次数', '已核销次数', '取消次数', '登录次数', '最近登录', '添加时间'];

			// 添加表头到数据开头
			data.unshift(header);

			// 修正exportUtil调用参数顺序: (key, title, total, data, options)
			return await exportUtil.exportDataExcel('EXPORT_TEACHER_DATA', title, data.length, data);
			
		} catch (error) {
			console.error('导出老师课时统计失败:', error);
			console.error('错误堆栈:', error.stack);
			this.AppError('导出数据失败: ' + error.message);
		}
	}

	/**取消某时段的所有预约记录 */
	async cancelJoinByTimeMark(meetId, timeMark, reason = '') {
		if (!meetId) this.AppError('ID不能为空');
		if (!timeMark) this.AppError('请提供时间标记');

		let meet = await MeetModel.getOne({_id: meetId});
		if (!meet) this.AppError('预约项目不存在');

		// 查找该时段的所有有效预约记录
		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: timeMark,
			JOIN_STATUS: JoinModel.STATUS.SUCC // 只取消正常状态的预约
		};

		let joins = await JoinModel.getAllBig(where);
		
		if (joins.length == 0) {
			this.AppError('该时段没有有效的预约记录');
		}

		// 批量取消预约
		let cancelData = {
			JOIN_STATUS: 99, // 管理员取消
			JOIN_REASON: reason || '管理员取消该时段',
			JOIN_EDIT_TIME: timeUtil.time()
		};

		for (let join of joins) {
			await JoinModel.edit(join._id, cancelData);
		}

		return { cancelCnt: joins.length };
	}

}

module.exports = AdminMeetService;