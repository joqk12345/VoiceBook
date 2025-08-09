/**
 * Notes: 通知后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2021-07-11 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const AdminHomeService = require('../admin/admin_home_service.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const util = require('../../../../framework/utils/util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const cloudUtil = require('../../../../framework/cloud/cloud_util.js');

const NewsModel = require('../../model/news_model.js');

class AdminNewsService extends BaseProjectAdminService {

	/** 推荐首页SETUP */
	async vouchNewsSetup(id, vouch) {
		if (!id) this.AppError('ID不能为空');
		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		let data = {
			NEWS_VOUCH: vouch
		};
		await NewsModel.edit(id, data);
	}

	/**添加通知 */
	async insertNews({
		title,
		cateId, //分类
		cateName,
		order,
		desc = '',
		forms,
		content = [], // 添加内容参数
		pic = [] // 添加图片参数
	}) {
		if (!title) this.AppError('请输入标题');
		if (!cateId) this.AppError('请选择分类');
		if (!cateName) this.AppError('请选择分类');

		// 生成业务ID
		let newsId = dataUtil.makeID();
		console.log('生成的NEWS_ID:', newsId);

		let data = {
			NEWS_ID: newsId, // 自动生成ID
			NEWS_TITLE: title,
			NEWS_CATE_ID: cateId,
			NEWS_CATE_NAME: cateName,
			NEWS_ORDER: order || 9999,
			NEWS_DESC: desc || '', // 确保描述不为undefined
			NEWS_FORMS: forms || [],
			NEWS_CONTENT: content || [], // 初始化内容
			NEWS_PIC: pic || [], // 初始化图片
			NEWS_ADD_TIME: timeUtil.time(),
			NEWS_EDIT_TIME: timeUtil.time(),
			NEWS_STATUS: 1,
			_pid: this.getProjectId()
		};

		console.log('准备插入的数据:', JSON.stringify(data, null, 2));

		let result = await NewsModel.insert(data);
		console.log('插入结果:', result);
		
		// 返回完整的新闻信息，包括生成的ID
		if (result) {
			let newNews = await this.getNewsDetail(result);
			console.log('返回的新闻信息:', JSON.stringify(newNews, null, 2));
			return newNews;
		}
		
		return result;
	}

	/**创建完整的通知信息（包含内容和图片）*/
	async createCompleteNews({
		title,
		cateId,
		cateName,
		order = 9999,
		desc = '',
		forms = [],
		content = [],
		pic = []
	}) {
		if (!title) this.AppError('请输入标题');
		if (!cateId) this.AppError('请选择分类');
		if (!cateName) this.AppError('请选择分类');

		console.log('创建完整新闻，输入参数:', {
			title, cateId, cateName, order, desc,
			formsLength: forms.length,
			contentLength: content.length,
			picLength: pic.length
		});

		// 生成业务ID
		let newsId = dataUtil.makeID();
		console.log('生成的NEWS_ID:', newsId);

		let data = {
			NEWS_ID: newsId,
			NEWS_TITLE: title,
			NEWS_CATE_ID: cateId,
			NEWS_CATE_NAME: cateName,
			NEWS_ORDER: order,
			NEWS_DESC: desc,
			NEWS_FORMS: forms,
			NEWS_CONTENT: content,
			NEWS_PIC: pic,
			NEWS_ADD_TIME: timeUtil.time(),
			NEWS_EDIT_TIME: timeUtil.time(),
			NEWS_STATUS: 1,
			_pid: this.getProjectId()
		};

		console.log('创建完整新闻数据:', JSON.stringify(data, null, 2));

		let result = await NewsModel.insert(data);
		console.log('插入结果:', result);
		
		if (result) {
			// 返回完整的新闻信息用于前端显示
			let newsDetail = await this.getNewsDetail(result);
			console.log('返回的完整新闻详情:', JSON.stringify(newsDetail, null, 2));
			return newsDetail;
		}
		
		return result;
	}

	/**删除通知数据 */
	async delNews(id) {
		if (!id) this.AppError('ID不能为空');
		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		// 删除资讯相关图片
		if (news.NEWS_PIC && news.NEWS_PIC.length > 0) {
			for (let pic of news.NEWS_PIC) {
				try {
					await cloudUtil.deleteFiles([pic]);
				} catch (e) {
					console.log('删除图片失败:', e);
				}
			}
		}

		await NewsModel.del({_id: id});
	}

	/**获取通知信息 */
	async getNewsDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let news = await NewsModel.getOne(where, fields);
		if (!news) return null;

		// 确保所有数组字段都有默认值
		if (!news.NEWS_CONTENT) news.NEWS_CONTENT = [];
		if (!news.NEWS_PIC) news.NEWS_PIC = [];
		if (!news.NEWS_FORMS) news.NEWS_FORMS = [];

		return news;
	}

	/** 预览资讯信息（包含完整内容和图片）*/
	async previewNews(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let news = await NewsModel.getOne(where, fields);
		if (!news) return null;

		console.log('预览新闻原始数据:', JSON.stringify(news, null, 2));

		// 确保内容和图片完整返回用于预览，提供合理的默认值
		if (!news.NEWS_CONTENT || !Array.isArray(news.NEWS_CONTENT)) {
			news.NEWS_CONTENT = [];
		}
		
		if (!news.NEWS_PIC || !Array.isArray(news.NEWS_PIC)) {
			news.NEWS_PIC = [];
		}
		
		if (!news.NEWS_FORMS || !Array.isArray(news.NEWS_FORMS)) {
			news.NEWS_FORMS = [];
		}
		
		// 为预览添加一些有用的信息
		news.PREVIEW_INFO = {
			hasContent: news.NEWS_CONTENT.length > 0,
			hasPictures: news.NEWS_PIC.length > 0,
			contentCount: news.NEWS_CONTENT.length,
			pictureCount: news.NEWS_PIC.length,
			previewTime: timeUtil.time(),
			contentDetail: news.NEWS_CONTENT, // 添加内容详情
			pictureDetail: news.NEWS_PIC // 添加图片详情
		};
		
		// 如果没有内容，添加提示信息 - 但不覆盖原始内容，而是在预览信息中提供
		if (news.NEWS_CONTENT.length === 0) {
			news.PREVIEW_INFO.defaultContent = [{
				type: 'text',
				val: '暂无内容，请编辑添加内容...'
			}];
		}

		// 如果没有图片，添加提示信息
		if (news.NEWS_PIC.length === 0) {
			news.PREVIEW_INFO.defaultPicture = '暂无图片，请编辑添加图片...';
		}

		console.log('预览新闻处理后数据:', JSON.stringify(news, null, 2));
		
		// 预览不增加访问次数，只是查看
		return news;
	}

	// 更新forms信息
	async updateNewsForms({
		id,
		hasImageForms
	}) {
		if (!id) this.AppError('ID不能为空');
		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		let data = {
			NEWS_FORMS: hasImageForms || [],
			NEWS_EDIT_TIME: timeUtil.time()
		};
		await NewsModel.edit(id, data);
	}


	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateNewsContent({
		id,
		content // 富文本数组
	}) {
		if (!id) this.AppError('ID不能为空');
		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		let data = {
			NEWS_CONTENT: content || [],
			NEWS_EDIT_TIME: timeUtil.time()
		};
		await NewsModel.edit(id, data);

		// 提取内容中的图片URLs
		let urls = [];
		if (content && Array.isArray(content)) {
			content.forEach(item => {
				if (item.type === 'img' && item.val) {
					urls.push(item.val);
				}
			});
		}
		return urls;
	}

	/**
	 * 更新资讯图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateNewsPic({
		id,
		imgList // 图片数组
	}) {
		if (!id) this.AppError('ID不能为空');
		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		let data = {
			NEWS_PIC: imgList || [],
			NEWS_EDIT_TIME: timeUtil.time()
		};
		await NewsModel.edit(id, data);

		// 返回图片URLs
		return imgList || [];
	}


	/**更新资讯数据 */
	async editNews({
		id,
		title,
		cateId, //分类
		cateName,
		order,
		desc = '',
		forms,
		content, // 添加内容参数
		pic // 添加图片参数
	}) {
		if (!id) this.AppError('ID不能为空');
		if (!title) this.AppError('请输入标题');
		if (!cateId) this.AppError('请选择分类');
		if (!cateName) this.AppError('请选择分类');

		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		console.log('编辑新闻，输入参数:', {
			id, title, cateId, cateName, order, desc,
			formsLength: forms ? forms.length : 'undefined',
			contentLength: content ? content.length : 'undefined',
			picLength: pic ? pic.length : 'undefined'
		});

		let data = {
			NEWS_TITLE: title,
			NEWS_CATE_ID: cateId,
			NEWS_CATE_NAME: cateName,
			NEWS_ORDER: order || 9999,
			NEWS_DESC: desc,
			NEWS_FORMS: forms || [],
			NEWS_EDIT_TIME: timeUtil.time()
		};

		// 如果提供了内容，则更新内容
		if (content !== undefined) {
			data.NEWS_CONTENT = content;
		}

		// 如果提供了图片，则更新图片
		if (pic !== undefined) {
			data.NEWS_PIC = pic;
		}

		console.log('准备更新的数据:', JSON.stringify(data, null, 2));

		await NewsModel.edit(id, data);
	}

	/**取得资讯分页列表 */
	async getAdminNewsList({
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
			'NEWS_ORDER': 'asc',
			'NEWS_ADD_TIME': 'desc'
		};
		// 包含内容和图片字段，用于预览
		let fields = 'NEWS_TITLE,NEWS_DESC,NEWS_CATE_ID,NEWS_CATE_NAME,NEWS_EDIT_TIME,NEWS_ADD_TIME,NEWS_ORDER,NEWS_STATUS,NEWS_CATE2_NAME,NEWS_VOUCH,NEWS_QR,NEWS_OBJ,NEWS_ID,NEWS_CONTENT,NEWS_PIC';

		// 使用简单的查询条件，避免复杂的and/or结构
		let where = {
			_pid: this.getProjectId()
		};

		if (util.isDefined(search) && search) {
			// 简化搜索，避免or查询
			where.NEWS_TITLE = ['like', search];
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId': {
					where.NEWS_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.NEWS_STATUS = Number(sortVal);
					break;
				}
				case 'vouch': {
					where.NEWS_VOUCH = 1;
					break;
				}
				case 'top': {
					where.NEWS_ORDER = 0;
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'NEWS_ADD_TIME');
					break;
				}
			}
		}

		// 添加附加查询条件
		if (whereEx && typeof whereEx === 'object') {
			Object.assign(where, whereEx);
		}

		let result = await NewsModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
		
		// 为管理员列表增加预览信息
		if (result && result.list) {
			result.list = result.list.map(item => {
				// 确保数组字段存在且为数组
				if (!item.NEWS_CONTENT || !Array.isArray(item.NEWS_CONTENT)) {
					item.NEWS_CONTENT = [];
				}
				if (!item.NEWS_PIC || !Array.isArray(item.NEWS_PIC)) {
					item.NEWS_PIC = [];
				}
				
				// 为预览添加内容摘要和首张图片
				item.PREVIEW_CONTENT = this._extractContentPreview(item.NEWS_CONTENT);
				item.PREVIEW_PIC = item.NEWS_PIC.length > 0 ? item.NEWS_PIC[0] : '';
				item.HAS_CONTENT = item.NEWS_CONTENT.length > 0;
				item.HAS_IMAGES = item.NEWS_PIC.length > 0;
				item.CONTENT_COUNT = item.NEWS_CONTENT.length;
				item.IMAGE_COUNT = item.NEWS_PIC.length;
				
				return item;
			});
		}
		
		return result;
	}
	
	/** 提取内容预览 */
	_extractContentPreview(content) {
		if (!content || !Array.isArray(content) || content.length === 0) {
			return '暂无内容';
		}
		
		// 查找第一个文本内容
		for (let item of content) {
			if (item.type === 'text' && item.val) {
				// 截取前50个字符作为预览
				return item.val.length > 50 ? item.val.substring(0, 50) + '...' : item.val;
			}
		}
		
		return '暂无文本内容';
	}

	/**修改资讯状态 */
	async statusNews(id, status) {
		if (!id) this.AppError('ID不能为空');
		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		let data = {
			NEWS_STATUS: status,
			NEWS_EDIT_TIME: timeUtil.time()
		};
		await NewsModel.edit(id, data);
	}

	/**置顶与排序设定 */
	async sortNews(id, sort) {
		if (!id) this.AppError('ID不能为空');
		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		let data = {
			NEWS_ORDER: sort,
			NEWS_EDIT_TIME: timeUtil.time()
		};
		await NewsModel.edit(id, data);
	}

	/**首页设定 */
	async vouchNews(id, vouch) {
		if (!id) this.AppError('ID不能为空');
		let news = await NewsModel.getOne({_id: id});
		if (!news) this.AppError('通知不存在');

		let data = {
			NEWS_VOUCH: vouch,
			NEWS_EDIT_TIME: timeUtil.time()
		};
		await NewsModel.edit(id, data);
	}
}

module.exports = AdminNewsService;