/**
 * Notes: 路由配置文件
  * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * User: CC
 * Date: 2020-10-14 07:00:00
 */

module.exports = {
	'test/test': 'test/test_controller@test',

	'home/setup_get': 'home_controller@getSetup',

	'passport/login': 'passport_controller@login',
	'passport/phone': 'passport_controller@getPhone',
	'passport/my_detail': 'passport_controller@getMyDetail',
	'passport/register': 'passport_controller@register',
	'passport/edit_base': 'passport_controller@editBase',

	// 收藏
	'fav/update': 'fav_controller@updateFav',
	'fav/del': 'fav_controller@delFav',
	'fav/is_fav': 'fav_controller@isFav',
	'fav/my_list': 'fav_controller@getMyFavList',

	// 服务者
	'work/home': 'work/work_home_controller@workHome',
	'work/login': 'work/work_home_controller@workLogin',
	'work/pwd': 'work/work_home_controller@pwdWork',
	'work/meet_detail': 'work/work_meet_controller@getMeetDetail',
	'work/get_meet_by_work_id': 'work/work_meet_controller@getMeetByWorkId',
	'work/meet_edit': 'work/work_meet_controller@editMeet',
	'work/meet_update_forms': 'work/work_meet_controller@updateMeetForms',

	'work/meet_temp_insert': 'work/work_meet_controller@insertMeetTemp',
	'work/meet_temp_list': 'work/work_meet_controller@getMeetTempList',
	'work/meet_temp_del': 'work/work_meet_controller@delMeetTemp',
	'work/meet_temp_edit': 'work/work_meet_controller@editMeetTemp', 

	'work/join_scan': 'work/work_meet_controller@scanJoin',
	'work/join_checkin': 'work/work_meet_controller@checkinJoin',
	'work/meet_day_list': 'work/work_meet_controller@getDayList',
	'work/meet_join_list': 'work/work_meet_controller@getJoinList',
	'work/join_status': 'work/work_meet_controller@statusJoin',
	'work/join_del': 'work/work_meet_controller@delJoin',

	// 工作者导出功能
	'work/join_data_get': 'work/work_meet_controller@joinDataGet',
	'work/join_data_export': 'work/work_meet_controller@joinDataExport',
	'work/join_data_del': 'work/work_meet_controller@joinDataDel',


	// 管理
	'admin/home': 'admin/admin_home_controller@adminHome',
	'admin/clear_vouch': 'admin/admin_home_controller@clearVouchData',

	'admin/login': 'admin/admin_mgr_controller@adminLogin',
	'admin/mgr_list': 'admin/admin_mgr_controller@getMgrList',
	'admin/mgr_insert': 'admin/admin_mgr_controller@insertMgr',
	'admin/mgr_del': 'admin/admin_mgr_controller@delMgr',
	'admin/mgr_detail': 'admin/admin_mgr_controller@getMgrDetail',
	'admin/mgr_edit': 'admin/admin_mgr_controller@editMgr',
	'admin/mgr_status': 'admin/admin_mgr_controller@statusMgr',
	'admin/mgr_pwd': 'admin/admin_mgr_controller@pwdMgr',
	'admin/log_list': 'admin/admin_mgr_controller@getLogList',
	'admin/log_clear': 'admin/admin_mgr_controller@clearLog',

	'admin/setup_set': 'admin/admin_setup_controller@setSetup',
	'admin/setup_set_content': 'admin/admin_setup_controller@setContentSetup',
	'admin/setup_qr': 'admin/admin_setup_controller@genMiniQr',
 
	
	// 用户
	'admin/user_list': 'admin/admin_user_controller@getUserList',
	'admin/user_detail': 'admin/admin_user_controller@getUserDetail',
	'admin/user_del': 'admin/admin_user_controller@delUser',
	'admin/user_insert': 'admin/admin_user_controller@insertUser',
	'admin/user_status': 'admin/admin_user_controller@statusUser',

	'admin/user_data_get': 'admin/admin_user_controller@userDataGet',
	'admin/user_data_export': 'admin/admin_user_controller@userDataExport',
	'admin/user_data_del': 'admin/admin_user_controller@userDataDel',


	// 内容  
	'home/list': 'home_controller@getHomeList',
	'news/list': 'news_controller@getNewsList',
	'news/view': 'news_controller@viewNews',

	'admin/news_list': 'admin/admin_news_controller@getAdminNewsList',
	'admin/news_insert': 'admin/admin_news_controller@insertNews',
	'admin/news_create_complete': 'admin/admin_news_controller@createCompleteNews',
	'admin/news_detail': 'admin/admin_news_controller@getNewsDetail',
	'admin/news_preview': 'admin/admin_news_controller@previewNews',
	'admin/news_edit': 'admin/admin_news_controller@editNews',
	'admin/news_update_forms': 'admin/admin_news_controller@updateNewsForms',
	'admin/news_update_pic': 'admin/admin_news_controller@updateNewsPic',
	'admin/news_update_content': 'admin/admin_news_controller@updateNewsContent',
	'admin/news_del': 'admin/admin_news_controller@delNews',
	'admin/news_sort': 'admin/admin_news_controller@sortNews',
	'admin/news_status': 'admin/admin_news_controller@statusNews',
	'admin/news_vouch': 'admin/admin_news_controller@vouchNews',


	// 预约
	'meet/list': 'meet_controller@getMeetList',
	'meet/list_by_day': 'meet_controller@getMeetListByDay',
	'meet/list_has_day': 'meet_controller@getHasDaysFromDay',
	'meet/view': 'meet_controller@viewMeet',
	'meet/detail_for_join': 'meet_controller@detailForJoin',
	'meet/before_join': 'meet_controller@beforeJoin',
	'meet/join': 'meet_controller@join',

	'meet/one_lesson_list': 'meet_controller@getOneLessonLogList',
	'meet/my_join_list': 'meet_controller@getMyJoinList',
	'meet/my_join_cancel': 'meet_controller@cancelMyJoin',
	'meet/my_join_detail': 'meet_controller@getMyJoinDetail',
	'meet/my_join_someday': 'meet_controller@getMyJoinSomeday',

	'admin/meet_user_lesson': 'admin/admin_meet_controller@editUserMeetLesson',
	'admin/meet_list': 'admin/admin_meet_controller@getAdminMeetList',
	'admin/meet_join_list': 'admin/admin_meet_controller@getJoinList',
	'admin/join_status': 'admin/admin_meet_controller@statusJoin',
	'admin/join_del': 'admin/admin_meet_controller@delJoin',
	'admin/meet_insert': 'admin/admin_meet_controller@insertMeet',
	'admin/meet_detail': 'admin/admin_meet_controller@getMeetDetail',
	'admin/meet_edit': 'admin/admin_meet_controller@editMeet',
	'admin/meet_update_forms': 'admin/admin_meet_controller@updateMeetForms',
	'admin/meet_del': 'admin/admin_meet_controller@delMeet',
	'admin/meet_sort': 'admin/admin_meet_controller@sortMeet',
	'admin/meet_vouch': 'admin/admin_meet_controller@vouchMeet',
	'admin/meet_status': 'admin/admin_meet_controller@statusMeet',
	'admin/meet_cancel_time_join': 'admin/admin_meet_controller@cancelJoinByTimeMark',
	'admin/join_scan': 'admin/admin_meet_controller@scanJoin',
	'admin/join_checkin': 'admin/admin_meet_controller@checkinJoin',
	'admin/self_checkin_qr': 'admin/admin_meet_controller@genSelfCheckinQr',
	'admin/meet_day_list': 'admin/admin_meet_controller@getDayList',
	'admin/meet_set_days': 'admin/admin_meet_controller@setDays',

	'admin/meet_temp_insert': 'admin/admin_meet_controller@insertMeetTemp',
	'admin/meet_temp_list': 'admin/admin_meet_controller@getMeetTempList',
	'admin/meet_temp_del': 'admin/admin_meet_controller@delMeetTemp',
	'admin/meet_temp_edit': 'admin/admin_meet_controller@editMeetTemp',

	'admin/join_data_get': 'admin/admin_meet_controller@joinDataGet',
	'admin/join_data_export': 'admin/admin_meet_controller@joinDataExport',
	'admin/join_data_del': 'admin/admin_meet_controller@joinDataDel',

	// 老师课时统计导出
	'admin/teacher_data_get': 'admin/admin_meet_controller@teacherDataGet',
	'admin/teacher_data_export': 'admin/admin_meet_controller@teacherDataExport',
	'admin/teacher_data_del': 'admin/admin_meet_controller@teacherDataDel',

}