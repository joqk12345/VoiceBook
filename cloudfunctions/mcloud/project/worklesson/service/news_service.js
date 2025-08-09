/**
 * Notes: 资讯模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2020-10-29 07:48:00 
 */

const BaseProjectService = require('./base_project_service.js');
const util = require('../../../framework/utils/util.js');
const NewsModel = require('../model/news_model.js');

class NewsService extends BaseProjectService {

	/** 浏览资讯信息 */
	async viewNews(id) {

		let fields = '*';

		let where = {
			_id: id,
			NEWS_STATUS: 1
		}
		let news = await NewsModel.getOne(where, fields);
		if (!news) return null;

		// 确保内容和图片数据被正确返回
		if (!news.NEWS_CONTENT || !Array.isArray(news.NEWS_CONTENT)) {
			news.NEWS_CONTENT = [];
		}
		
		if (!news.NEWS_PIC || !Array.isArray(news.NEWS_PIC)) {
			news.NEWS_PIC = [];
		}
		
		if (!news.NEWS_FORMS || !Array.isArray(news.NEWS_FORMS)) {
			news.NEWS_FORMS = [];
		}
		
		// 增加访问次数
		try {
			await NewsModel.inc(id, 'NEWS_VIEW_CNT', 1);
		} catch (e) {
			console.log('增加访问次数失败:', e);
		}

		return news;
	}


	/** 取得分页列表 */
	async getNewsList({
		cateId, 
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序 
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'NEWS_ORDER': 'asc',
			'NEWS_ADD_TIME': 'desc'
		};
		// 增加内容和图片字段到返回字段列表
		let fields = 'NEWS_PIC,NEWS_CONTENT,NEWS_VIEW_CNT,NEWS_TITLE,NEWS_DESC,NEWS_CATE_ID,NEWS_ADD_TIME,NEWS_ORDER,NEWS_STATUS,NEWS_CATE_NAME,NEWS_OBJ,NEWS_ID';

		// 使用简单的查询条件，避免复杂的and/or结构
		let where = {
			_pid: this.getProjectId(),
			NEWS_STATUS: 1 // 状态 
		};

		if (cateId && cateId !== '0') {
			where.NEWS_CATE_ID = cateId;
		}

		// 如果有搜索条件，为了避免复杂查询，先获取数据再过滤
		if (util.isDefined(search) && search) {
			// 搜索功能暂时简化，避免or查询
			where.NEWS_TITLE = ['like', search];
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'NEWS_ADD_TIME');
					break;
				}
				case 'cateId': {
					if (sortVal) where.NEWS_CATE_ID = String(sortVal);
					break;
				}
			}
		}

		let result = await NewsModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
		
		// 确保每个新闻项都有完整的数据结构
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
				
				return item;
			});
		}
		
		return result;
	}
	
	/** 提取内容预览 */
	_extractContentPreview(content) {
		if (!content || !Array.isArray(content) || content.length === 0) {
			return '';
		}
		
		// 查找第一个文本内容
		for (let item of content) {
			if (item.type === 'text' && item.val) {
				// 截取前100个字符作为预览
				return item.val.length > 100 ? item.val.substring(0, 100) + '...' : item.val;
			}
		}
		
		return '';
	}  

}

module.exports = NewsService;