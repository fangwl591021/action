<!DOCTYPE html>
<html lang="zh-TW">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>宏學管理站</title>
    <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/vue/3.3.4/vue.global.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        [v-cloak] { display: none !important; }
        body { background-color: #F8FAFC; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
        
        .sidebar { width: 240px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; position: fixed; height: 100vh; z-index: 50; }
        .sidebar-brand { padding: 20px 24px; font-size: 20px; font-weight: 800; color: #06C755; letter-spacing: -0.5px; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 14px 24px; cursor: pointer; transition: 0.2s; color: #64748b; font-weight: 600; border-right: 4px solid transparent; font-size: 15px; }
        .nav-active { background-color: #f0fdf4; color: #06C755; border-right: 4px solid #06C755; }
        
        .main-content { margin-left: 240px; min-width: 0; flex: 1; padding-bottom: 0; }
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 40; }
        
        .admin-table-container { background: white; border-radius: 8px; border: 1px solid #e2e8f0; margin: 24px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .admin-table thead th { padding: 12px 16px; background: #f8fafc; font-size: 14px; font-weight: 700; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .admin-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
        .admin-table tbody td { padding: 16px; font-size: 15px; vertical-align: middle; }

        .status-badge { font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 13px; }
        .status-pill-waiting { background-color: #FEF3C7; color: #92400E; }
        .status-pill-paid { background-color: #DCFCE7; color: #166534; }
        
        .btn-green-main { background-color: #06C755; color: white; font-weight: 600; padding: 10px 20px; border-radius: 8px; transition: 0.2s; text-align: center; font-size: 15px; }
        .btn-green-main:disabled { opacity: 0.6; }

        .modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-body { background: white; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); max-height: 90vh; }
        .modal-body-lg { max-width: 1000px; }
        
        .input-label { font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 6px; display: block; }
        .input-field { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; font-size: 15px; outline: none; transition: 0.2s; background: #fff; }
        .input-field:focus { border-color: #06C755; box-shadow: 0 0 0 3px rgba(6, 199, 85, 0.1); }
        .input-field:disabled { background-color: #f8fafc; color: #94a3b8; border-color: #e2e8f0; }
        
        .section-title { font-size: 16px; font-weight: 700; color: #1e293b; border-left: 4px solid #06C755; padding-left: 10px; margin-bottom: 16px; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hide-scrollbar::-webkit-scrollbar { height: 6px; display: block; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        @media (max-width: 768px) {
            .sidebar { display: none; } 
            .main-content { margin-left: 0; padding-bottom: 80px; } 
            .page-header { padding: 12px 16px; flex-wrap: wrap; gap: 8px; } 
            .admin-table-container { margin: 12px 0; border-radius: 0; border-left: none; border-right: none; }
            .admin-table tbody td { padding: 12px; font-size: 14px; }
            .admin-table thead th { padding: 10px 12px; font-size: 13px; }
            .modal-mask { padding: 0; }
            .modal-body { max-width: 100%; max-height: 100%; height: 100%; border-radius: 0; }
            .modal-body-lg { border-radius: 0; }
        }
    </style>
</head>

<body>
    <div id="app" v-cloak>
        
        <div v-if="!isAuthenticated" class="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 relative">
            <div v-if="isLiffLoading" class="absolute inset-0 bg-[#F8FAFC] z-50 flex flex-col items-center justify-center">
                <i class="fas fa-circle-notch fa-spin text-4xl text-[#06C755] mb-4"></i>
                <div class="text-slate-500 font-bold">檢查登入狀態中...</div>
            </div>
            <div class="max-w-[360px] w-full bg-white rounded-2xl shadow-sm p-8 animate-fade-in border border-slate-200 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1.5 bg-[#06C755]"></div>
                <div class="text-center mb-8">
                    <div class="w-14 h-14 bg-[#f0fdf4] text-[#06C755] rounded-xl flex items-center justify-center text-2xl mx-auto mb-4 border border-[#dcfce7]"><i class="fas fa-shield-alt"></i></div>
                    <h2 class="text-xl font-bold text-slate-800">宏學管理站</h2>
                    <p class="text-slate-500 text-sm mt-1.5 font-medium">請登入以存取系統資料</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="input-label">管理員帳號</label>
                        <div class="relative">
                            <i class="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input type="text" v-model="loginForm.account" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#06C755] transition bg-slate-50 focus:bg-white text-slate-800" placeholder="請輸入帳號" @keyup.enter="handleLogin">
                        </div>
                    </div>
                    <div>
                        <label class="input-label">存取密碼</label>
                        <div class="relative">
                            <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input type="password" v-model="loginForm.password" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#06C755] transition bg-slate-50 focus:bg-white text-slate-800" placeholder="請輸入密碼" @keyup.enter="handleLogin">
                        </div>
                    </div>
                    <div v-if="loginError" class="text-orange-600 text-xs font-bold text-center bg-orange-50 py-2.5 rounded-lg border border-orange-100 animate-fade-in"><i class="fas fa-exclamation-circle mr-1"></i> {{ loginError }}</div>
                    <button @click="handleLogin" :disabled="isLoading" class="w-full py-3 bg-slate-800 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-slate-700 transition mt-2">
                        {{ isLoading ? '驗證中...' : '帳號密碼登入' }}
                    </button>
                    <div class="pt-4 pb-2 flex items-center justify-between"><hr class="w-full border-slate-200"><span class="px-3 text-xs text-slate-400 font-bold">或</span><hr class="w-full border-slate-200"></div>
                    <button @click="liffLogin" :disabled="isLoading" class="w-full py-3 bg-[#06C755] text-white rounded-lg font-bold text-sm shadow-sm hover:bg-[#05b04a] transition flex justify-center items-center gap-2">
                        <i class="fab fa-line text-lg"></i> 使用 LINE 快速登入
                    </button>
                </div>
            </div>
        </div>

        <div v-else class="flex min-h-screen">
            <aside class="sidebar hidden md:flex">
                <div class="sidebar-brand">宏學管理站</div>
                <nav class="flex-grow mt-2">
                    <div @click="view = 'dashboard'" class="nav-item" :class="{'nav-active': view === 'dashboard'}"><i class="fas fa-chart-pie w-6 text-center"></i>營運統計</div>
                    <div @click="view = 'calendar'" class="nav-item" :class="{'nav-active': view === 'calendar'}"><i class="far fa-calendar-alt w-6 text-center"></i>日曆檢視</div>
                    <div @click="view = 'courses'" class="nav-item" :class="{'nav-active': view === 'courses'}"><i class="fas fa-book w-6 text-center"></i>一般課程管理</div>
                    <div @click="view = 'orders'" class="nav-item" :class="{'nav-active': view === 'orders'}"><i class="fas fa-list-check w-6 text-center"></i>訂單管理控制台</div>
                    <div @click="view = 'members'" class="nav-item" :class="{'nav-active': view === 'members' || view === 'member_detail'}"><i class="fas fa-users w-6 text-center"></i>學員會員管理</div>
                    <div @click="view = 'settings'" class="nav-item border-t border-slate-100 mt-2 pt-4" :class="{'nav-active': view === 'settings'}"><i class="fas fa-cog w-6 text-center"></i>全域系統設定</div>
                </nav>
                <div class="p-4 border-t border-gray-100 space-y-2">
                    <button @click="goToFrontend" class="w-full py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-100 transition"><i class="fas fa-mobile-alt mr-2"></i>切換前台</button>
                    <button @click="logout" class="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-orange-500 transition"><i class="fas fa-sign-out-alt mr-2"></i>安全登出</button>
                </div>
            </aside>

            <nav class="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 flex justify-around items-center h-[60px] pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
                <button @click="view = 'dashboard'" class="flex-1 flex flex-col items-center justify-center gap-1 h-full transition" :class="view === 'dashboard' ? 'text-[#06C755]' : 'text-slate-400 hover:text-slate-500'"><i class="fas fa-chart-pie text-xl"></i><span class="text-[10px] font-bold">統計</span></button>
                <button @click="view = 'calendar'" class="flex-1 flex flex-col items-center justify-center gap-1 h-full transition" :class="view === 'calendar' ? 'text-[#06C755]' : 'text-slate-400 hover:text-slate-500'"><i class="far fa-calendar-alt text-xl"></i><span class="text-[10px] font-bold">日曆</span></button>
                <button @click="view = 'courses'" class="flex-1 flex flex-col items-center justify-center gap-1 h-full transition" :class="view === 'courses' ? 'text-[#06C755]' : 'text-slate-400 hover:text-slate-500'"><i class="fas fa-book text-xl"></i><span class="text-[10px] font-bold">課程</span></button>
                <button @click="view = 'orders'" class="flex-1 flex flex-col items-center justify-center gap-1 h-full transition" :class="view === 'orders' ? 'text-[#06C755]' : 'text-slate-400 hover:text-slate-500'"><i class="fas fa-list-check text-xl"></i><span class="text-[10px] font-bold">訂單</span></button>
                <button @click="view = 'members'" class="flex-1 flex flex-col items-center justify-center gap-1 h-full transition" :class="view === 'members' || view === 'member_detail' ? 'text-[#06C755]' : 'text-slate-400 hover:text-slate-500'"><i class="fas fa-users text-xl"></i><span class="text-[10px] font-bold">學員</span></button>
                <button @click="goToFrontend" class="flex-1 flex flex-col items-center justify-center gap-1 h-full transition text-slate-400 hover:text-blue-500"><i class="fas fa-mobile-alt text-xl"></i><span class="text-[10px] font-bold">前台</span></button>
            </nav>

            <main class="main-content relative">
                <header class="page-header flex-col items-start md:flex-row md:items-center">
                    <div class="flex justify-between w-full md:w-auto items-center mb-3 md:mb-0">
                        <h2 class="text-xl md:text-2xl font-bold text-slate-800">{{ currentViewName }}</h2>
                        <button class="md:hidden text-slate-400 p-1 text-xl" @click="logout" title="登出"><i class="fas fa-sign-out-alt"></i></button>
                    </div>
                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <button @click="triggerBackup" :disabled="isLoading" class="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 border border-blue-200 rounded-md text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition shadow-sm"><i class="fas fa-hdd text-sm" :class="{'fa-pulse': isLoading}"></i><span>備份</span></button>
                        <button @click="runHealthCheck" :disabled="isLoading" class="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 border border-orange-200 rounded-md text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition shadow-sm"><i class="fas fa-stethoscope text-sm" :class="{'fa-pulse': isLoading}"></i><span>健檢</span></button>
                        <button @click="fetchData" :disabled="isLoading" class="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition shadow-sm"><i class="fas fa-sync-alt text-sm" :class="{'fa-spin': isLoading}"></i><span>同步</span></button>
                    </div>
                </header>

                <div class="py-4">
                    <div v-if="view === 'dashboard'" class="p-6 animate-fade-in">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div v-for="s in statsSummary" :key="s.label" class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                <div class="text-xs font-bold text-slate-500 uppercase mb-1">{{ s.label }}</div>
                                <div class="text-2xl font-bold" :class="s.colorClass">$ {{ s.value.toLocaleString() }}</div>
                            </div>
                        </div>
                        <div class="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                            <table class="admin-table">
                                <thead><tr class="bg-slate-50/80"><th>課程名稱</th><th class="text-center">報名數</th><th>應收</th><th class="text-orange-600">待收</th><th class="text-[#06C755]">實收</th></tr></thead>
                                <tbody>
                                    <tr v-for="c in courseStatsFiltered" :key="c.id">
                                        <td class="font-bold text-slate-800 text-base max-w-[200px] truncate">{{ c.name }}</td><td class="text-center text-lg font-bold">{{ c.totalOrders }}</td><td class="text-base font-medium text-slate-600">$ {{ c.totalExpected.toLocaleString() }}</td><td class="text-orange-600 font-bold text-base">$ {{ c.pendingAmount.toLocaleString() }}</td><td class="text-[#06C755] font-bold text-lg">$ {{ c.paidAmount.toLocaleString() }}</td>
                                    </tr>
                                    <tr v-if="courseStatsFiltered.length === 0"><td colspan="5" class="text-center text-slate-400 py-10 text-base font-medium">尚無報名資料</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div v-if="view === 'calendar'" class="animate-fade-in p-6 h-[calc(100vh-100px)]">
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm w-full h-full overflow-hidden">
                            <iframe src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=Asia%2FTaipei&showPrint=0&src=ZDUyMDgyNzIzOGMyYjI0MDE5MTYxY2E1N2FiOTI1YjI3N2E4YmNlNjE5YTFkYzI3NzViZjc4MGVkNzMwOGI3NEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23f09300" style="border-width:0" width="100%" height="100%" frameborder="0" scrolling="yes"></iframe>
                        </div>
                    </div>

                    <div v-if="view === 'courses'" class="animate-fade-in">
                        <div class="px-6 md:px-8 mt-2 flex flex-col md:flex-row gap-3 mb-4">
                            <div class="relative flex-1">
                                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                <input type="text" v-model="courseSearchQuery" placeholder="搜尋課程名稱或 ID..." class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#06C755] transition shadow-sm bg-white text-slate-800">
                            </div>
                            <select v-model="courseFilterCategory" class="w-full md:w-auto px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#06C755] transition shadow-sm text-slate-700 bg-white cursor-pointer font-bold">
                                <option value="">所有分類</option>
                                <option v-for="cat in adminCategories" :key="cat" :value="cat">{{ cat }}</option>
                            </select>
                        </div>
                        <div class="admin-table-container !mt-0 !mx-6 md:!mx-8 !rounded-xl">
                            <table class="admin-table">
                                <thead><tr><th style="min-width: 280px">課程資訊</th><th style="min-width: 140px">時間</th><th>名額/費用</th><th>繳費狀況</th><th class="text-right">操作</th></tr></thead>
                                <tbody>
                                    <tr v-for="c in filteredAdminCourses" :key="c.id" :class="{'opacity-70': c.isPublished === false}">
                                        <td>
                                            <div class="flex items-center gap-2 mb-1.5"><div class="font-bold text-base text-slate-800 leading-snug">{{ c.name }}</div><span v-if="c.isPublished === false" class="bg-slate-200 text-slate-500 text-[11px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">已下架</span><span v-else-if="c.isRegistrationOpen === false" class="bg-orange-50 text-orange-600 text-[11px] px-1.5 py-0.5 rounded border border-orange-200 font-bold whitespace-nowrap">僅曝光</span></div>
                                            <div class="text-slate-500 text-[13px] mb-2 font-medium">時段：{{ c.timeSlotType || '未填寫時段' }}</div>
                                            <span class="bg-slate-100 text-slate-400 text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200">{{ c.id }}</span>
                                        </td>
                                        <td><span class="bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[11px] px-2 py-0.5 rounded mb-2 inline-block">{{ c.type || '未分類' }}</span><div class="text-[14px] text-slate-600 font-medium whitespace-nowrap">{{ c.startDate }}<br class="md:hidden"> <span class="hidden md:inline">~</span> {{ c.endDate }}</div></td>
                                        <td>
                                            <div class="text-lg font-bold text-[#06C755] mb-1">${{ formatPrice(c.price) }}</div>
                                            <div v-if="c.discountRule && c.discountRule !== 'NONE'" class="text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded inline-block mb-1 border border-orange-100">{{ getDiscountLabel(c.discountRule) }}</div>
                                            <div v-if="c.paymentMethod === 'REMITTANCE'" class="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block mb-1 border border-blue-100">🏦 僅限匯款</div>
                                            <div class="text-slate-500 text-[13px] font-medium whitespace-nowrap mt-1">報名：{{ c.enrolled }} / {{ c.capacity }} 人</div>
                                        </td>
                                        <td>
                                            <div class="text-[13px] text-slate-600 mb-2 font-medium whitespace-nowrap">已收: <span class="text-[#06C755] font-bold text-[14px]">{{ getCoursePaidCount(c.id) }}</span><br class="md:hidden"> 待付: <span class="text-orange-500 font-bold text-[14px]">{{ getCoursePendingCount(c.id) }}</span></div>
                                            <button @click="openEnrollments(c)" class="px-3 py-1.5 bg-white border border-slate-300 shadow-sm hover:bg-slate-50 text-slate-700 text-[12px] rounded-md transition font-bold inline-flex items-center gap-1 whitespace-nowrap"><i class="fas fa-list text-slate-400"></i> 查看名單</button>
                                        </td>
                                        <td class="text-right">
                                            <div class="flex justify-end gap-4 items-center">
                                                <button @click="syncToCalendar(c)" class="text-slate-400 hover:text-[#f09300] text-lg transition" title="強制同步至日曆"><i class="fas fa-calendar-plus"></i></button>
                                                <button @click="copyCourse(c)" class="text-slate-400 hover:text-slate-700 text-lg transition" title="複製課程"><i class="far fa-copy"></i></button>
                                                <button @click="openEditModal(c)" class="text-[13px] text-blue-600 font-bold transition whitespace-nowrap bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100">編輯</button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredAdminCourses.length === 0"><td colspan="5" class="text-center text-slate-400 py-10 text-base font-medium">找不到符合條件的課程</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div v-if="view === 'orders'" class="animate-fade-in">
                        <div class="px-6 md:px-8 mt-2 flex flex-col md:flex-row gap-3 mb-4">
                            <div class="relative flex-1"><i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i><input type="text" v-model="orderSearchQuery" placeholder="搜尋單號、時間或姓名..." class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#06C755] transition shadow-sm bg-white text-slate-800"></div>
                            <div class="flex gap-2">
                                <select v-model="orderFilterCourse" class="flex-1 md:flex-none md:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#06C755] transition shadow-sm text-slate-700 bg-white cursor-pointer font-bold truncate max-w-[180px] md:max-w-none"><option value="">所有課程</option><option v-for="c in adminOrderCourses" :key="c.id" :value="c.id">{{ c.name }}</option></select>
                                <select v-model="orderFilterStatus" class="flex-1 md:flex-none md:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#06C755] transition shadow-sm text-slate-700 bg-white cursor-pointer font-bold"><option value="">所有狀態</option><option value="PAID">✅ 已完款</option><option value="PENDING">⏳ 待付</option><option value="CANCELLED">❌ 取消</option></select>
                            </div>
                        </div>
                        <div class="admin-table-container !mt-0 !mx-6 md:!mx-8 !rounded-xl">
                            <table class="admin-table">
                                <thead><tr><th>時間/單號</th><th>課程名稱</th><th>學員</th><th>金額/折抵</th><th>狀態</th><th>後五碼</th><th class="text-right">維護</th></tr></thead>
                                <tbody>
                                    <tr v-for="o in filteredAdminOrders" :key="o.orderId">
                                        <td><div class="text-[13px] text-slate-500 mb-1 whitespace-nowrap font-medium">{{ o.createdAt || '-' }}</div><div class="text-[13px] font-mono font-bold text-slate-600 line-clamp-1">{{ o.orderId }}</div></td>
                                        <td class="font-bold text-slate-800 text-base max-w-[180px] truncate">{{ getCourseName(o.courseId) }}</td>
                                        <td><div class="font-bold text-slate-800 text-base whitespace-nowrap">{{ o.name }}</div><div class="text-[13px] text-slate-500 font-mono mt-1">{{ o.phone }}</div></td>
                                        <td class="whitespace-nowrap">
                                            <div class="text-lg font-bold text-[#06C755]">$ {{ formatPrice(o.amount) }}</div>
                                            <div v-if="o.pointsUsed > 0" class="text-[12px] font-bold text-red-500 mt-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 inline-block">🧧 -{{ o.pointsUsed }} 點</div>
                                        </td>
                                        <td><span :class="(o.status || 'PENDING') === 'PAID' ? 'status-pill-paid' : 'status-pill-waiting'" class="status-badge whitespace-nowrap">{{ (o.status || 'PENDING') === 'PAID' ? '已完款' : ((o.status || 'PENDING') === 'CANCELLED' ? '已取消' : '待付款') }}</span></td>
                                        <td class="font-bold text-blue-600 text-[15px] tracking-wider">{{ o.remittance || '-' }}</td>
                                        <td class="text-right"><button @click="openOrderEditModal(o)" class="px-4 py-1.5 border border-slate-300 rounded-md text-[13px] font-bold bg-white hover:bg-slate-50 transition whitespace-nowrap shadow-sm text-slate-700">編輯狀態</button></td>
                                    </tr>
                                    <tr v-if="filteredAdminOrders.length === 0"><td colspan="7" class="text-center text-slate-400 py-10 text-base font-medium">找不到符合條件的訂單</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div v-if="view === 'members'" class="animate-fade-in">
                        <div class="admin-table-container !mt-0 !mx-6 md:!mx-8 !rounded-xl">
                            <table class="admin-table">
                                <thead><tr><th>姓名</th><th>性別</th><th>手機</th><th>會員等級</th><th>註冊日期</th><th class="text-right">操作</th></tr></thead>
                                <tbody>
                                    <tr v-for="u in users" :key="u.userId">
                                        <td class="font-bold text-slate-800 text-base">{{ u.name }}</td><td class="text-[15px] text-slate-600">{{ u.gender }}</td><td class="font-mono text-[15px] text-slate-600">{{ u.phone }}</td>
                                        <td><span class="text-[#06C755] text-[13px] font-bold bg-green-50 border border-green-100 px-2 py-1 rounded">{{ u.memberTier || '一般會員' }}</span></td>
                                        <td class="text-[13px] text-slate-500 whitespace-nowrap font-medium">{{ u.createdAt }}</td>
                                        <td class="text-right"><button @click="openMemberDetail(u)" class="px-4 py-1.5 border border-blue-200 rounded-md text-[13px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition whitespace-nowrap shadow-sm">CRM 檔案</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div v-if="view === 'member_detail'" class="p-6 animate-fade-in max-w-5xl mx-auto">
                        <button @click="view = 'members'" class="text-slate-500 text-[15px] font-bold flex items-center mb-6 hover:text-slate-700 transition"><i class="fas fa-chevron-left mr-2"></i>返回學員名冊</button>

                        <div class="grid grid-cols-1 flex-col xl:grid xl:grid-cols-12 gap-6 mb-8">
                            <div class="xl:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div class="flex justify-between items-center mb-6"><h3 class="text-lg font-bold text-slate-800"><i class="fas fa-id-card text-[#06C755] mr-2"></i>學員資料</h3></div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div><label class="input-label">姓名</label><input type="text" v-model="activeMember.name" class="input-field font-bold"></div>
                                    <div><label class="input-label">性別</label><select v-model="activeMember.gender" class="input-field"><option value="男">男</option><option value="女">女</option></select></div>
                                    <div><label class="input-label">手機號碼</label><input type="tel" v-model="activeMember.phone" class="input-field font-mono"></div>
                                    <div><label class="input-label">生日</label><input type="date" v-model="activeMember.birthday" class="input-field"></div>
                                    
                                    <div><label class="input-label">會員等級</label>
                                        <select v-model="activeMember.memberTier" class="input-field font-bold text-[#06C755] bg-green-50 border-green-200">
                                            <option value="一般會員">一般會員</option><option value="喚醒階段會員">喚醒階段會員</option><option value="蛻變階段會員">蛻變階段會員</option><option value="完整階段會員">完整階段會員</option>
                                        </select>
                                    </div>
                                    <div><label class="input-label">專屬推薦代碼</label><input type="text" v-model="activeMember.referralCode" class="input-field font-mono font-bold text-slate-400 bg-slate-50" disabled placeholder="尚未產生"></div>
                                    
                                    <div class="sm:col-span-2"><label class="input-label">聯絡地址</label><input type="text" v-model="activeMember.address" class="input-field"></div>
                                    
                                    <div class="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                                        <div class="text-[13px] text-slate-500 font-bold mb-2">🎁 推薦人資訊追蹤</div>
                                        <div v-if="activeMember.referrerName" class="text-lg font-bold text-slate-800">{{ activeMember.referrerName }} <span class="text-[13px] text-slate-400 ml-2 font-mono">{{ activeMember.referrerUid }}</span></div>
                                        <div v-else class="text-[15px] font-medium text-slate-400">無推薦人</div>
                                    </div>
                                </div>
                                <button @click="saveMemberDetail" :disabled="isLoading" class="mt-6 w-full py-3.5 bg-[#06C755] text-white rounded-xl font-bold shadow-sm hover:bg-[#05b04a] transition">
                                    {{ isLoading ? '儲存中...' : '儲存學員資料' }}
                                </button>
                            </div>

                            <div class="xl:col-span-5 bg-[#f8fafc] p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[300px] xl:h-auto">
                                <h3 class="text-lg font-bold text-slate-800 mb-4"><i class="fas fa-sticky-note text-orange-500 mr-2"></i>管理員備註 (CRM)</h3>
                                <textarea v-model="activeMember.adminNote" class="input-field flex-grow resize-none text-[15px] leading-relaxed bg-white border-slate-200" placeholder="紀錄學員特殊狀況..."></textarea>
                                <button @click="saveMemberDetail" :disabled="isLoading" class="mt-4 w-full py-3.5 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition">
                                    儲存備註
                                </button>
                            </div>
                        </div>

                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                            <div class="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2"><i class="fas fa-wallet text-red-500"></i>紅包點數帳戶</h3>
                                <div class="text-slate-500 text-[15px] font-bold">目前餘額： <span class="text-2xl font-bold text-red-500 ml-1">{{ activeMemberPoints.balance ? activeMemberPoints.balance.toLocaleString() : 0 }}</span> <span class="text-[13px] ml-0.5">點</span></div>
                            </div>
                            <div class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div class="lg:col-span-1 space-y-3">
                                    <button @click="openPointActionModal('MANUAL_ADD')" class="w-full py-3 bg-green-50 text-green-600 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition shadow-sm flex items-center justify-center gap-2"><i class="fas fa-plus-circle"></i> 手動贈送</button>
                                    <button @click="openPointActionModal('MANUAL_DEDUCT')" class="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition shadow-sm flex items-center justify-center gap-2"><i class="fas fa-minus-circle"></i> 手動扣除</button>
                                </div>
                                <div class="lg:col-span-2 overflow-x-auto border border-slate-100 rounded-xl">
                                    <table class="admin-table w-full text-[14px] !m-0">
                                        <thead><tr class="bg-slate-50"><th>時間</th><th>類型</th><th>事由</th><th class="text-right">點數</th><th class="text-right">結餘</th></tr></thead>
                                        <tbody>
                                            <tr v-for="log in activeMemberPoints.logs" :key="log.logId" class="border-b border-slate-50">
                                                <td class="text-[12px] text-slate-400 whitespace-nowrap font-mono">{{ log.createdAt }}</td>
                                                <td><span class="text-[11px] font-bold px-1.5 py-0.5 rounded border" :class="(log.type==='SYSTEM_EARN' || log.type==='MANUAL_ADD') ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'">{{ log.type.includes('ADD')||log.type.includes('EARN')?'獲得':'扣除' }}</span></td>
                                                <td class="text-slate-600">{{ log.reason }}</td>
                                                <td class="text-right font-bold" :class="(log.type==='SYSTEM_EARN' || log.type==='MANUAL_ADD') ? 'text-green-600' : 'text-red-500'">{{ (log.type==='SYSTEM_EARN' || log.type==='MANUAL_ADD') ? '+' : '-' }}{{ Number(log.amount || 0).toLocaleString() }}</td>
                                                <td class="text-right font-bold text-slate-500">{{ Number(log.balance || 0).toLocaleString() }}</td>
                                            </tr>
                                            <tr v-if="!activeMemberPoints.logs || activeMemberPoints.logs.length === 0"><td colspan="5" class="text-center text-slate-400 py-6">無點數紀錄</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
                            <h3 class="text-lg font-bold text-slate-800 p-6 pb-4 border-b border-slate-100"><i class="fas fa-history text-blue-500 mr-2"></i>購買與上課紀錄</h3>
                            <div class="overflow-x-auto pb-4">
                                <table class="admin-table w-full min-w-[800px] !border-none !shadow-none !m-0">
                                    <thead><tr class="bg-white"><th>日期/單號</th><th>課程名稱</th><th>金額/折抵</th><th>付款狀態</th><th>出席狀況</th><th class="text-right">操作</th></tr></thead>
                                    <tbody>
                                        <tr v-for="o in memberOrders" :key="o.orderId">
                                            <td class="pl-6">
                                                <div class="text-[13px] text-slate-500 mb-1 font-medium">{{ o.createdAt || '-' }}</div>
                                                <div class="text-[13px] font-mono font-bold text-slate-500">{{ o.orderId }}</div>
                                            </td>
                                            <td class="font-bold text-slate-700 text-[15px] max-w-[200px] truncate">{{ getCourseName(o.courseId) }}</td>
                                            <td class="whitespace-nowrap">
                                                <div class="font-bold text-[#06C755] text-lg">$ {{ formatPrice(o.amount) }}</div>
                                                <div v-if="o.pointsUsed > 0" class="text-[11px] font-bold text-red-500 mt-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 inline-block">🧧 -{{ o.pointsUsed }} 點</div>
                                            </td>
                                            <td><span :class="(o.status || 'PENDING') === 'PAID' ? 'status-pill-paid' : 'status-pill-waiting'" class="status-badge whitespace-nowrap">{{ (o.status || 'PENDING') === 'PAID' ? '已完款' : ((o.status || 'PENDING') === 'CANCELLED' ? '已取消' : '待付款') }}</span></td>
                                            <td>
                                                <select v-model="o.attendance" @change="updateOrderAttendance(o)" class="px-3 py-1.5 border border-slate-200 rounded-md text-[13px] font-bold outline-none cursor-pointer shadow-sm transition" :class="{'bg-green-50 text-green-700 border-green-200': o.attendance === 'ATTENDED', 'bg-red-50 text-red-600 border-red-200': o.attendance === 'ABSENT', 'bg-white text-slate-500 hover:bg-slate-50': !o.attendance}">
                                                    <option value="">-- 未標記 --</option><option value="ATTENDED">🟢 已出席</option><option value="ABSENT">🔴 缺席</option>
                                                </select>
                                            </td>
                                            <td class="text-right pr-6"><button @click="openOrderEditModal(o)" class="px-4 py-1.5 border border-slate-300 rounded-md text-[13px] font-bold bg-white hover:bg-slate-50 transition whitespace-nowrap shadow-sm text-slate-600">編輯</button></td>
                                        </tr>
                                        <tr v-if="memberOrders.length === 0"><td colspan="6" class="text-center text-slate-400 py-10 text-[15px] font-medium">該學員尚無報名紀錄</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div v-if="view === 'settings'" class="p-6 animate-fade-in max-w-4xl mx-auto">
                        
                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mb-8 relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                            <div class="section-title !mb-4 flex items-center gap-2 text-red-700 border-red-500">
                                <i class="fas fa-gift"></i> 裂變行銷 (Viral Marketing) 紅包獎勵設定
                            </div>
                            <p class="text-[14px] text-slate-500 mb-6 leading-relaxed">設定各項推廣動作的發放點數。系統 LIFF ID 必填，才能正確產生分享連結與 QR Code 圖片。</p>
                            
                            <div class="mb-6"><label class="input-label">系統主 LIFF ID (產生分享連結用)</label><input type="text" v-model="sysSettings.liff_id" class="input-field text-[15px] font-mono text-slate-600" placeholder="例如：2009130603-vTHZv1LW"></div>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                <div><label class="input-label">新客註冊 (點)</label><input type="number" v-model="sysSettings.reward_register" class="input-field text-[15px] font-bold text-[#06C755]" placeholder="200"></div>
                                <div><label class="input-label">自己加好友 (點)</label><input type="number" v-model="sysSettings.reward_self_add" class="input-field text-[15px] font-bold text-[#06C755]" placeholder="100"></div>
                                <div><label class="input-label">被加好友 (點)</label><input type="number" v-model="sysSettings.reward_referred" class="input-field text-[15px] font-bold text-[#06C755]" placeholder="400"></div>
                                <div><label class="input-label">推薦好友 (點)</label><input type="number" v-model="sysSettings.reward_refer" class="input-field text-[15px] font-bold text-[#06C755]" placeholder="100"></div>
                                <div><label class="input-label">每日打卡 (點)</label><input type="number" v-model="sysSettings.reward_daily" class="input-field text-[15px] font-bold text-[#06C755]" placeholder="10"></div>
                            </div>
                        </div>

                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mb-8 relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                            <div class="section-title !mb-4 flex items-center gap-2 text-blue-800 border-blue-500">
                                <i class="fas fa-credit-card"></i> 藍新金流 (NewebPay) 設定 <span class="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded ml-2">測試/正式共用</span>
                            </div>
                            <p class="text-[14px] text-slate-500 mb-6 leading-relaxed">請輸入藍新金流提供之 API 金鑰。系統會自動根據此金鑰建立交易加密封包。</p>
                            <div class="space-y-4">
                                <div><label class="input-label">商店代號 (MerchantID)</label><input type="text" v-model="sysSettings.newebpay_merchant_id" class="input-field text-[15px] font-mono" placeholder="例：MS12345678"></div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label class="input-label">HashKey (加密金鑰)</label><input type="text" v-model="sysSettings.newebpay_hash_key" class="input-field text-[15px] font-mono text-slate-600 bg-slate-50"></div>
                                    <div><label class="input-label">HashIV (加密向量)</label><input type="text" v-model="sysSettings.newebpay_hash_iv" class="input-field text-[15px] font-mono text-slate-600 bg-slate-50"></div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
                            <div class="section-title !mb-4">結帳紅包折抵參數 (%)</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div><label class="input-label">規則 A 上限 (%)</label><input type="number" v-model="sysSettings.discount_rate_a" class="input-field text-[15px]" placeholder="20"></div>
                                <div><label class="input-label">規則 B 上限 (%)</label><input type="number" v-model="sysSettings.discount_rate_b" class="input-field text-[15px]" placeholder="50"></div>
                                <div><label class="input-label">規則 C 上限 (%)</label><input type="number" v-model="sysSettings.discount_rate_c" class="input-field text-[15px]" placeholder="100"></div>
                            </div>
                        </div>

                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
                            <div class="section-title !mb-6">首頁頂部橫幅 (Banner)</div>
                            <div class="w-full aspect-[21/9] bg-[#f8fafc] rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center relative mb-5"><img v-if="sysSettings.banner_image" :src="sysSettings.banner_image" class="w-full h-full object-cover"><div v-else class="text-slate-300 font-bold text-sm uppercase flex items-center gap-2"><i class="fas fa-image"></i> 尚未設定橫幅</div></div>
                            <input type="text" v-model="sysSettings.banner_image" class="input-field mb-5 font-mono text-[14px]" placeholder="請貼上 Banner 網址">
                            <div class="flex items-center gap-4 mb-5"><div class="h-px bg-slate-100 flex-1"></div><span class="text-[11px] text-slate-400 font-bold uppercase tracking-wider">或</span><div class="h-px bg-slate-100 flex-1"></div></div>
                            <button @click="$refs.bannerInput.click()" class="w-full py-3.5 border border-slate-200 rounded-xl text-[15px] font-bold text-slate-600 bg-white hover:bg-slate-50 transition shadow-sm"><i class="fas fa-upload mr-2"></i>本機上傳 (嘗試壓縮)</button>
                            <input type="file" ref="bannerInput" class="hidden" accept="image/*" @change="handleBannerUpload">
                        </div>
                        
                        <div class="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mb-8">
                            <div class="section-title !mb-6">社群導流網址設定</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label class="input-label"><i class="fab fa-line text-[#06C755] w-5 text-center mr-1"></i>LINE OA</label><input type="text" v-model="sysSettings.link_lineoa" class="input-field text-[15px]"></div>
                                <div><label class="input-label"><i class="fab fa-facebook text-[#1877F2] w-5 text-center mr-1"></i>Facebook</label><input type="text" v-model="sysSettings.link_fb" class="input-field text-[15px]"></div>
                                <div><label class="input-label"><i class="fab fa-instagram text-[#E4405F] w-5 text-center mr-1"></i>Instagram</label><input type="text" v-model="sysSettings.link_ig" class="input-field text-[15px]"></div>
                                <div><label class="input-label"><i class="fab fa-line text-[#06C755] w-5 text-center mr-1"></i>LINE 社群</label><input type="text" v-model="sysSettings.link_line" class="input-field text-[15px]"></div>
                                <div><label class="input-label"><i class="fab fa-tiktok text-black w-5 text-center mr-1"></i>TikTok</label><input type="text" v-model="sysSettings.link_tiktok" class="input-field text-[15px]"></div>
                                <div><label class="input-label"><i class="fas fa-globe text-slate-400 w-5 text-center mr-1"></i>官方網站</label><input type="text" v-model="sysSettings.link_web" class="input-field text-[15px]"></div>
                            </div>
                        </div>
                        <div class="flex justify-end pb-10 md:pb-0"><button @click="saveSettings" :disabled="isLoading" class="btn-green-main w-full md:w-auto px-12 py-3.5 shadow-sm">{{ isLoading ? '儲存中...' : '儲存系統設定' }}</button></div>
                    </div>
                </div>
            </main>
            
            <div v-if="editingCourse" class="modal-mask" @click.self="editingCourse = null">
                <div class="modal-body modal-body-lg animate-fade-in flex flex-col bg-[#f8fafc]">
                    <div class="px-6 py-5 border-b flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                        <h3 class="text-lg font-bold text-slate-800">活動內容編輯</h3>
                        <button @click="editingCourse = null" class="text-slate-400 hover:text-slate-600 p-2"><i class="fas fa-times text-xl"></i></button>
                    </div>
                    <div class="flex-grow overflow-y-auto p-5 md:p-8 hide-scrollbar">
                        
                        <div class="col-span-12 bg-white p-6 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                            <div class="text-base font-bold text-slate-700 mb-5 flex items-center"><i class="fas fa-sliders-h text-blue-500 mr-2"></i>上架與報名權限設定</div>
                            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div class="space-y-4">
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 gap-3">
                                        <div class="font-bold text-slate-600 text-[14px]">課程上架狀態 (V欄)</div>
                                        <select v-model="editingCourse.isPublished" class="input-field !w-auto !py-2 !text-[14px] font-bold cursor-pointer transition-colors" :class="editingCourse.isPublished ? 'text-green-700 border-green-200' : 'text-slate-500 border-slate-200'"><option :value="true">🟢 上架中 (前台可見)</option><option :value="false">🔴 已下架 (前台隱藏)</option></select>
                                    </div>
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 gap-3">
                                        <div class="font-bold text-slate-600 text-[14px]">開放報名開關 (W欄)</div>
                                        <select v-model="editingCourse.isRegistrationOpen" class="input-field !w-auto !py-2 !text-[14px] font-bold cursor-pointer transition-colors" :class="editingCourse.isRegistrationOpen ? 'text-blue-700 border-blue-200' : 'text-orange-600 border-orange-200'"><option :value="true">🔓 開放報名 (顯示按鈕)</option><option :value="false">🔒 僅曝光 (隱藏按鈕)</option></select>
                                    </div>
                                    
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 gap-3">
                                        <div class="font-bold text-slate-600 text-[14px]">紅包折抵規則 (Y欄)</div>
                                        <select v-model="editingCourse.discountRule" class="input-field !w-auto !py-2 !text-[14px] font-bold cursor-pointer transition-colors text-slate-700 bg-white border-slate-200">
                                            <option value="NONE">🚫 不可折抵 (純現金)</option>
                                            <option value="RULE_A">🔵 規則 A (目前 {{sysSettings.discount_rate_a || 20}}%)</option>
                                            <option value="RULE_B">🟡 規則 B (目前 {{sysSettings.discount_rate_b || 50}}%)</option>
                                            <option value="RULE_C">🟢 規則 C (目前 {{sysSettings.discount_rate_c || 100}}%)</option>
                                        </select>
                                    </div>

                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100 gap-3">
                                        <div class="font-bold text-blue-700 text-[14px]">開放付款方式 (Z欄)</div>
                                        <select v-model="editingCourse.paymentMethod" class="input-field !w-auto !py-2 !text-[14px] font-bold cursor-pointer transition-colors text-blue-800 bg-white border-blue-200 shadow-sm">
                                            <option value="ALL">💳 線上刷卡 + 匯款</option>
                                            <option value="REMITTANCE">🏦 僅限實體匯款</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <div class="font-bold text-slate-600 text-[14px] mb-3">適用會員權限 (X欄)</div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <label class="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition"><input type="checkbox" v-model="editingCourse.targetTiers" value="一般會員" class="w-5 h-5 accent-[#06C755]"> <span class="text-slate-700 font-bold text-[14px]">一般會員</span></label>
                                        <label class="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition"><input type="checkbox" v-model="editingCourse.targetTiers" value="喚醒階段會員" class="w-5 h-5 accent-[#06C755]"> <span class="text-slate-700 font-bold text-[14px]">喚醒階段會員</span></label>
                                        <label class="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition"><input type="checkbox" v-model="editingCourse.targetTiers" value="蛻變階段會員" class="w-5 h-5 accent-[#06C755]"> <span class="text-slate-700 font-bold text-[14px]">蛻變階段會員</span></label>
                                        <label class="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition"><input type="checkbox" v-model="editingCourse.targetTiers" value="完整階段會員" class="w-5 h-5 accent-[#06C755]"> <span class="text-slate-700 font-bold text-[14px]">完整階段會員</span></label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 mb-6">
                            <div class="lg:col-span-7 space-y-5 bg-white p-6 md:p-0 rounded-2xl md:bg-transparent shadow-sm md:shadow-none">
                                <div class="flex flex-col sm:flex-row gap-5">
                                    <div class="sm:w-1/3"><label class="input-label">ID (A欄)</label><input type="text" v-model="editingCourse.id" disabled class="input-field disabled:bg-slate-50 font-mono text-[13px] text-slate-500"></div>
                                    <div class="flex-grow"><label class="input-label">分類 (M欄)</label><input type="text" v-model="editingCourse.type" class="input-field"></div>
                                </div>
                                <div><label class="input-label">課程名稱 (B欄)</label><input type="text" v-model="editingCourse.name" class="input-field font-bold text-[16px]"></div>
                                <div class="grid grid-cols-2 gap-5">
                                    <div><label class="input-label">費用 (E欄)</label><input type="text" v-model="editingCourse.price" class="input-field font-bold text-[#06C755]"></div>
                                    <div><label class="input-label">名額 (F欄)</label><input type="number" v-model="editingCourse.capacity" class="input-field font-bold"></div>
                                </div>
                                <div><label class="input-label">時段描述 (N欄)</label><input type="text" v-model="editingCourse.timeSlotType" class="input-field"></div>
                                <div class="grid grid-cols-2 gap-5">
                                    <div><label class="input-label">開始日期 (C欄)</label><input type="date" v-model="editingCourse.startDate" class="input-field text-[14px]"></div>
                                    <div><label class="input-label">開始時間 (K欄)</label><input type="time" v-model="editingCourse.startTime" class="input-field text-[14px]"></div>
                                </div>
                                <div class="grid grid-cols-2 gap-5">
                                    <div><label class="input-label">結束日期 (D欄)</label><input type="date" v-model="editingCourse.endDate" class="input-field text-[14px]"></div>
                                    <div><label class="input-label">結束時間 (L欄)</label><input type="time" v-model="editingCourse.endTime" class="input-field text-[14px]"></div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div><label class="input-label">地點 (H欄)</label><input type="text" v-model="editingCourse.location" class="input-field text-[14px]"></div>
                                    <div><label class="input-label">導師 (I欄)</label><input type="text" v-model="editingCourse.instructor" class="input-field text-[14px]"></div>
                                </div>
                            </div>
                            
                            <div class="lg:col-span-5 bg-white p-6 md:p-0 rounded-2xl md:bg-transparent shadow-sm md:shadow-none">
                                <div class="section-title !mb-4">宣傳圖片</div>
                                <div class="w-full aspect-[4/3] bg-[#f8fafc] rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center relative mb-4">
                                    <img v-if="editingCourse.image" :src="editingCourse.image" class="w-full h-full object-cover">
                                    <div v-else class="text-slate-300 font-bold text-[13px] uppercase flex items-center gap-2"><i class="fas fa-image text-lg"></i> 無圖片</div>
                                </div>
                                <input type="text" v-model="editingCourse.image" class="input-field mb-4 font-mono text-[12px]" placeholder="貼上外部網址 (如 https://s3...)">
                                <div class="flex items-center gap-3 mb-4"><div class="h-px bg-slate-100 flex-1"></div><span class="text-[11px] text-slate-400 font-bold">或</span><div class="h-px bg-slate-100 flex-1"></div></div>
                                <button @click="$refs.fileInput.click()" class="w-full py-3 border border-slate-200 rounded-lg text-[14px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition shadow-sm"><i class="fas fa-upload mr-2"></i>本機上傳 (50%壓縮)</button>
                                <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileUpload">
                            </div>
                        </div>

                        <div class="bg-white p-6 md:p-0 md:bg-transparent rounded-2xl shadow-sm md:shadow-none md:border-t md:border-slate-200 md:pt-6">
                            <div class="section-title !mb-4">詳細內容 (S 欄)</div>
                            <textarea v-model="editingCourse.description" class="input-field min-h-[250px] resize-y text-[15px] leading-relaxed p-5 bg-slate-50 border-slate-100 focus:bg-white" placeholder="輸入課程文案..."></textarea>
                        </div>
                        <div class="h-[60px] md:hidden"></div> 
                    </div>
                    <div class="px-6 md:px-8 py-4 border-t bg-white flex flex-col md:flex-row justify-end gap-3 sticky bottom-0 md:rounded-b-2xl pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                        <button @click="editingCourse = null" class="w-full md:w-auto px-6 py-2.5 md:py-2 text-slate-500 font-bold border border-slate-200 rounded-lg md:border-none md:bg-transparent bg-white text-[15px]">取消</button>
                        <button @click="saveCourse" :disabled="isLoading" class="w-full md:w-auto bg-[#06C755] text-white px-8 py-2.5 md:py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-[#05b04a] transition shadow-sm text-[15px]">{{ isLoading ? '處理中' : '儲存變更' }}</button>
                    </div>
                </div>
            </div>

            <div v-if="activeEnrollmentCourse" class="modal-mask" @click.self="activeEnrollmentCourse = null">
                <div class="modal-body modal-body-lg animate-fade-in flex flex-col bg-[#f8fafc]">
                    <div class="px-6 py-5 border-b flex justify-between items-center sticky top-0 bg-white z-10 shadow-sm">
                        <h3 class="text-lg font-bold text-slate-800 line-clamp-1 pr-4">{{ activeEnrollmentCourse.name }} - 名單</h3>
                        <button @click="activeEnrollmentCourse = null" class="text-slate-400 hover:text-slate-600 p-2"><i class="fas fa-times text-xl"></i></button>
                    </div>
                    <div class="flex-grow overflow-y-auto bg-slate-50 md:bg-white p-0 md:p-8">
                        <div class="m-5 md:m-0 md:mb-6 bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                            <div class="flex items-center gap-2 mb-3"><i class="fas fa-link text-blue-500 text-lg"></i><h4 class="font-bold text-blue-700 text-[15px]">導師專屬簽到連結 (免進後台)</h4></div>
                            <div class="flex flex-col sm:flex-row gap-3">
                                <input type="text" v-model="activeEnrollmentCourse.checkinPwd" placeholder="請設定簽到密碼 (必填)" class="input-field bg-white font-mono font-bold text-slate-600 text-[14px] py-2">
                                <button @click="generateCheckinLink(activeEnrollmentCourse)" :disabled="isLoading" class="bg-blue-600 text-white font-bold text-[14px] px-5 py-2 rounded-lg hover:bg-blue-700 transition whitespace-nowrap shadow-sm disabled:opacity-50">
                                    {{ activeEnrollmentCourse.checkinPwd ? '儲存並產生網址' : '儲存密碼' }}
                                </button>
                            </div>
                            <div v-if="checkinUrl" class="mt-4 animate-fade-in">
                                <p class="text-[13px] text-slate-500 mb-1 font-bold">請複製以下網址交給課程導師：</p>
                                <div class="text-[13px] text-blue-600 font-mono bg-white p-3 rounded-lg border border-blue-100 break-all select-all flex justify-between items-center gap-3">
                                    <span>{{ checkinUrl }}</span><button @click="copyUrl" class="text-slate-500 hover:text-blue-600 bg-slate-50 rounded px-3 py-1.5 text-[12px] font-bold transition shrink-0 border border-slate-200"><i class="far fa-copy mr-1"></i> 複製</button>
                                </div>
                            </div>
                        </div>

                        <div class="overflow-x-auto w-full md:border md:border-slate-200 md:rounded-xl shadow-sm">
                            <table class="admin-table w-full min-w-[900px] bg-white !m-0">
                                <thead><tr class="bg-slate-50"><th>學員姓名</th><th>電話</th><th>金額</th><th>狀態</th><th>後五碼</th><th>簽到狀態</th><th class="text-right">操作</th></tr></thead>
                                <tbody>
                                    <tr v-for="o in courseOrders" :key="o.orderId" class="border-b border-slate-50">
                                        <td class="pl-6 font-bold text-[15px] text-slate-800">{{ o.name }}</td><td class="font-mono text-[14px] text-slate-500">{{ o.phone }}</td>
                                        <td class="font-bold text-[#06C755] text-[15px]">\$ {{ formatPrice(o.amount) }}</td>
                                        <td><span :class="(o.status || 'PENDING')==='PAID'?'status-pill-paid':'status-pill-waiting'" class="status-badge">{{ (o.status || 'PENDING')==='PAID'?'已完款':'待付款' }}</span></td>
                                        <td class="text-[14px] font-mono text-slate-600 tracking-wider">{{ o.remittance || '-' }}</td>
                                        <td>
                                            <select v-model="o.attendance" @change="updateOrderAttendance(o)" class="px-3 py-1.5 border border-slate-200 rounded-md text-[13px] font-bold outline-none cursor-pointer shadow-sm transition" :class="{'bg-green-50 text-green-700 border-green-200': o.attendance === 'ATTENDED', 'bg-red-50 text-red-600 border-red-200': o.attendance === 'ABSENT', 'bg-white text-slate-500 hover:bg-slate-50': !o.attendance}">
                                                <option value="">-- 未標記 --</option><option value="ATTENDED">🟢 出席</option><option value="ABSENT">🔴 缺席</option>
                                            </select>
                                        </td>
                                        <td class="text-right pr-6"><button @click="openOrderEditModal(o)" class="bg-white border border-slate-200 text-slate-600 text-[13px] font-bold px-3 py-1.5 rounded-md transition hover:bg-slate-50 shadow-sm whitespace-nowrap">編輯狀態</button></td>
                                    </tr>
                                    <tr v-if="courseOrders.length === 0"><td colspan="7" class="text-center text-slate-400 py-10 text-[15px] font-medium">尚無報名資料</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <div v-if="editingOrder" class="modal-mask" @click.self="editingOrder = null">
                <div class="modal-body animate-fade-in flex flex-col bg-[#f8fafc]">
                    <div class="px-6 py-5 border-b flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                        <h3 class="text-lg font-bold text-gray-800">訂單狀態維護</h3><button @click="editingOrder = null" class="text-slate-400 hover:text-slate-600 p-2"><i class="fas fa-times text-xl"></i></button>
                    </div>
                    <div class="flex-grow p-6 space-y-6 overflow-y-auto">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label class="input-label">付款狀態</label><select v-model="editingOrder.status" class="input-field font-bold text-slate-700"><option value="PENDING">⏳ 待付款</option><option value="PAID">✅ 已完款</option><option value="CANCELLED">❌ 已取消</option></select></div>
                            <div><label class="input-label">實收金額</label><input type="number" v-model.number="editingOrder.amount" class="input-field text-[#06C755] font-bold"></div>
                        </div>
                        <div><label class="input-label">匯款後五碼</label><input type="text" v-model="editingOrder.remittance" class="input-field font-mono font-bold tracking-widest text-[16px]" maxlength="5"></div>
                        <div><label class="input-label">訂單備註</label><textarea v-model="editingOrder.note" class="input-field min-h-[120px] resize-y leading-relaxed text-[15px]"></textarea></div>
                    </div>
                    <div class="px-6 py-4 bg-white border-t flex flex-col md:flex-row justify-end gap-3 sticky bottom-0 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                        <button @click="editingOrder = null" class="w-full md:w-auto px-6 py-2.5 rounded-lg font-bold text-slate-500 border border-slate-200 bg-white text-[15px] shadow-sm">取消</button>
                        <button @click="saveOrderUpdate" :disabled="isLoading" class="btn-green-main w-full md:w-auto min-w-[120px] py-2.5 text-[15px] shadow-sm">{{ isLoading ? '更新中...' : '確認更新狀態' }}</button>
                    </div>
                </div>
            </div>

            <div v-if="editingPointAction" class="modal-mask" @click.self="editingPointAction = null">
                <div class="modal-body animate-fade-in flex flex-col bg-white">
                    <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10" :class="editingPointAction.type === 'MANUAL_ADD' ? 'bg-green-50' : 'bg-red-50'">
                        <h3 class="text-lg font-bold" :class="editingPointAction.type === 'MANUAL_ADD' ? 'text-green-700' : 'text-red-700'">
                            <i class="mr-2" :class="editingPointAction.type === 'MANUAL_ADD' ? 'fas fa-plus-circle' : 'fas fa-minus-circle'"></i>
                            {{ editingPointAction.type === 'MANUAL_ADD' ? '手動贈送點數' : '手動扣除點數' }}
                        </h3>
                        <button @click="editingPointAction = null" class="text-slate-400 hover:text-slate-600 p-2"><i class="fas fa-times text-xl"></i></button>
                    </div>
                    <div class="flex-grow p-6 space-y-6 overflow-y-auto">
                        <div>
                            <label class="input-label">異動點數 (絕對值金額)</label>
                            <div class="relative">
                                <div class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl" :class="editingPointAction.type === 'MANUAL_ADD' ? 'text-green-500' : 'text-red-500'">{{ editingPointAction.type === 'MANUAL_ADD' ? '+' : '-' }}</div>
                                <input type="number" v-model.number="editingPointAction.amount" class="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-lg outline-none focus:border-[#06C755] font-bold" placeholder="例如：1000">
                            </div>
                        </div>
                        <div>
                            <label class="input-label">異動原因 / 備註</label>
                            <input type="text" v-model="editingPointAction.reason" class="input-field text-[15px]" placeholder="例如：線下活動贈點、客訴補償...">
                        </div>
                    </div>
                    <div class="px-6 py-5 border-t border-slate-50 flex justify-end gap-3 bg-slate-50/50">
                        <button @click="editingPointAction = null" class="px-6 py-2.5 rounded-lg font-bold text-slate-500 border border-slate-200 bg-white text-[15px] shadow-sm hover:bg-slate-50 transition">取消</button>
                        <button @click="submitPointAction" :disabled="isLoading" class="px-8 py-2.5 rounded-lg font-bold text-white text-[15px] shadow-sm transition" :class="editingPointAction.type === 'MANUAL_ADD' ? 'bg-[#06C755] hover:bg-[#05b04a]' : 'bg-red-500 hover:bg-red-600'">
                            {{ isLoading ? '處理中...' : '確認送出' }}
                        </button>
                    </div>
                </div>
            </div>
            
        </div>
    </div>

    <script>
        const { createApp, ref, computed, onMounted } = Vue;
        const WORKER_URL = 'https://action.fangwl591021.workers.dev/';

        createApp({
            setup() {
                const isAuthenticated = ref(false);
                const loginForm = ref({ account: '', password: '' });
                const loginError = ref('');
                const isLiffLoading = ref(true); 

                const handleLogin = async () => {
                    if (loginForm.value.account === 'admin' && loginForm.value.password === '@1234') {
                        loginError.value = ''; 
                        isAuthenticated.value = true; 
                        await fetchData();
                    } else { 
                        loginError.value = '您輸入的帳號或密碼不正確'; 
                    }
                };

                const logout = () => { 
                    isAuthenticated.value = false; 
                    loginForm.value = { account: '', password: '' }; 
                    view.value = 'dashboard'; courses.value = []; orders.value = []; users.value = []; 
                    if (liff.isLoggedIn()) { liff.logout(); } 
                };

                const view = ref('dashboard'); 
                const courses = ref([]); 
                const orders = ref([]); 
                const users = ref([]); 
                
                const sysSettings = ref({ 
                    banner_image: '', link_fb: '', link_ig: '', link_line: '', link_lineoa: '', link_tiktok: '', link_web: '', 
                    discount_rate_a: 20, discount_rate_b: 50, discount_rate_c: 100,
                    newebpay_merchant_id: '', newebpay_hash_key: '', newebpay_hash_iv: '',
                    liff_id: '', reward_register: 200, reward_self_add: 100, reward_referred: 400, reward_refer: 100, reward_daily: 10 
                });
                
                const isLoading = ref(false); 
                
                const editingCourse = ref(null); 
                const editingOrder = ref(null); 
                const activeMember = ref(null); 
                const activeEnrollmentCourse = ref(null);
                const checkinUrl = ref('');
                
                const activeMemberPoints = ref({ balance: 0, logs: [] });
                const editingPointAction = ref(null);
                
                const courseSearchQuery = ref(''); const courseFilterCategory = ref(''); const orderSearchQuery = ref(''); const orderFilterCourse = ref(''); const orderFilterStatus = ref('');
                const currentViewName = computed(() => ({'dashboard': '營運統計', 'courses': '課程管理', 'orders': '訂單維護', 'members': '學員名冊', 'settings': '全域系統設定', 'member_detail': '學員 CRM 檔案', 'calendar': '近期課程日曆'}[view.value]));
                const formatPrice = (p) => { if(!p) return "0"; const clean = String(p).replace(/[^0-9.]/g, ""); return Number(clean).toLocaleString(); };

                const statsSummary = computed(() => {
                    let paid = 0, pending = 0;
                    orders.value.forEach(o => { const amt = Number(String(o.amount).replace(/[^0-9.]/g, "")) || 0; if (o.status === 'PAID') paid += amt; else if ((o.status || 'PENDING') === 'PENDING') pending += amt; });
                    return [ { label: '實收總額', value: paid, colorClass: 'text-[#06C755]' }, { label: '待收總額', value: pending, colorClass: 'text-orange-500' }, { label: '累計單數', value: orders.value.length, colorClass: 'text-blue-600' }, { label: '系統會員', value: users.value.length, colorClass: 'text-purple-600' } ];
                });

                const courseStatsFiltered = computed(() => {
                    return courses.value.map(c => {
                        const cOrders = orders.value.filter(o => o.courseId === c.id || o.courseId === c.name);
                        let data = { id: c.id, name: c.name, totalOrders: cOrders.length, totalExpected: 0, pendingAmount: 0, paidAmount: 0 };
                        cOrders.forEach(o => { const amt = Number(String(o.amount).replace(/[^0-9.]/g, "")) || 0; if ((o.status || 'PENDING') === 'PENDING') { data.pendingAmount += amt; data.totalExpected += amt; } else if (o.status === 'PAID') { data.paidAmount += amt; data.totalExpected += amt; } });
                        return data;
                    }).filter(c => c.totalOrders > 0);
                });

                const adminCategories = computed(() => { return [...new Set(courses.value.map(c => c.type))].filter(Boolean); });
                const filteredAdminCourses = computed(() => { return courses.value.filter(c => { const matchCat = !courseFilterCategory.value || c.type === courseFilterCategory.value; const query = courseSearchQuery.value.toLowerCase(); const matchQuery = !query || (c.name && c.name.toLowerCase().includes(query)) || (c.id && c.id.toLowerCase().includes(query)); return matchCat && matchQuery; }); });
                const getCourseName = (id) => { return courses.value.find(c => c.id === id || c.name === id)?.name || id; };
                const adminOrderCourses = computed(() => { const courseIds = [...new Set(orders.value.map(o => o.courseId))].filter(Boolean); return courseIds.map(id => ({ id: id, name: getCourseName(id) })); });
                const filteredAdminOrders = computed(() => {
                    let result = [...orders.value].reverse();
                    if (orderFilterStatus.value) { result = result.filter(o => { const currentStatus = o.status || 'PENDING'; return currentStatus === orderFilterStatus.value; }); }
                    if (orderFilterCourse.value) { result = result.filter(o => o.courseId === orderFilterCourse.value); }
                    if (orderSearchQuery.value) { const q = orderSearchQuery.value.toLowerCase(); result = result.filter(o => (o.orderId && o.orderId.toLowerCase().includes(q)) || (o.name && o.name.toLowerCase().includes(q)) || (o.phone && o.phone.toLowerCase().includes(q)) || (o.createdAt && o.createdAt.toLowerCase().includes(q))); }
                    return result;
                });

                const getDiscountLabel = (rule) => {
                    if (rule === 'RULE_A' || rule === '20%') return `最高折抵 ${sysSettings.value.discount_rate_a || 20}%`;
                    if (rule === 'RULE_B' || rule === '50%') return `最高折抵 ${sysSettings.value.discount_rate_b || 50}%`;
                    if (rule === 'RULE_C' || rule === '100%') return `可全額折抵 (最高 ${sysSettings.value.discount_rate_c || 100}%)`;
                    return '';
                };

                const callApi = async (act, pl = {}) => {
                    isLoading.value = true;
                    try {
                        const res = await fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act, payload: pl }) });
                        const json = await res.json(); 
                        if (json.status !== 'success') throw new Error(json.message || json.data || '系統回應異常'); 
                        return json.data;
                    } catch (e) { 
                        console.warn(`[API 請求提示 - ${act}]`, e.message);
                        if (e.message.includes('Timeout') || e.message.includes('Failed to fetch')) {
                            alert('☁️ Google 伺服器剛甦醒 (冷啟動)，請再點擊一次重試！');
                        } else {
                            alert(`⚠️ 系統提示：\n${e.message}`);
                        }
                        return null; 
                    }
                    finally { isLoading.value = false; }
                };

                const verifyLiffAdmin = async () => {
                    isLoading.value = true; loginError.value = '';
                    try {
                        const profile = await liff.getProfile();
                        const res = await callApi('ADMIN_LOGIN_UID', { uid: profile.userId });
                        if (res && res.success) { isAuthenticated.value = true; await fetchData(); }
                    } catch (e) {
                        loginError.value = e.message || '此 LINE 帳號無管理員權限'; liff.logout(); 
                    } finally { isLoading.value = false; }
                };

                const liffLogin = async () => { 
                    await loadSystemData(); 
                    const currentLiffId = (sysSettings.value.liff_id || '').trim();
                    if (!currentLiffId) {
                        alert('⚠️ 系統尚未初始化\n請先至後台「全域系統設定」填寫「系統主 LIFF ID」');
                        return;
                    }

                    if (!liff.isLoggedIn()) { 
                        liff.init({ liffId: currentLiffId }).then(() => {
                            liff.login({ redirectUri: window.location.href });
                        }).catch(e => alert("LIFF 啟動失敗：" + e.message));
                    } else { 
                        verifyLiffAdmin(); 
                    } 
                };

                const goToFrontend = () => { window.location.href = 'index.html'; };

                onMounted(async () => {
                    try {
                        await loadSystemData();
                        const currentLiffId = (sysSettings.value.liff_id || '').trim();
                        if (currentLiffId) {
                            await liff.init({ liffId: currentLiffId });
                            if (liff.isLoggedIn()) { await verifyLiffAdmin(); }
                        }
                    } catch (err) { console.error('LIFF 初始化失敗', err); } finally { isLiffLoading.value = false; }
                });

                const loadSystemData = async () => { 
                    try {
                        const [coursesData, settingsData] = await Promise.all([ callApi('GET_COURSES'), callApi('GET_SETTINGS') ]);
                        if(settingsData && Object.keys(settingsData).length > 0) sysSettings.value = Object.assign(sysSettings.value, settingsData);
                        courses.value = coursesData; 
                    } catch (e) { console.error('載入系統資料失敗', e); } finally { isLoading.value = false; }
                };

                const fetchData = async () => { 
                    const data = await callApi('ADMIN_GET_DATA'); 
                    if (data) { courses.value = data.courses || []; orders.value = data.orders || []; users.value = data.users || []; sysSettings.value = Object.assign(sysSettings.value, data.settings || {}); } 
                };

                const runHealthCheck = async () => { const data = await callApi('SYSTEM_HEALTH_CHECK'); if (data && data.status === 'healthy') alert('🎉 系統健康檢查通過！\n\n' + data.log.join('\n')); };
                const triggerBackup = async () => { if (!confirm('將打包資料庫並備份至 Drive，確認執行？')) return; const data = await callApi('ADMIN_TRIGGER_BACKUP'); if (data && data.success) alert('🎉 ' + data.message); };
                const openEnrollments = (c) => { activeEnrollmentCourse.value = c; checkinUrl.value = ''; }; 
                const openOrderEditModal = (o) => { activeEnrollmentCourse.value = null; editingOrder.value = { ...o }; };
                const saveOrderUpdate = async () => { if(await callApi('ADMIN_UPDATE_ORDER', editingOrder.value)) { editingOrder.value = null; await fetchData(); } };
                
                const openMemberDetail = async (u) => {
                    activeMember.value = JSON.parse(JSON.stringify(u));
                    view.value = 'member_detail'; window.scrollTo({ top: 0, behavior: 'smooth' });
                    const pts = await callApi('GET_USER_POINTS', { targetUid: u.userId });
                    if (pts) activeMemberPoints.value = pts;
                };
                
                const saveMemberDetail = async () => { if (await callApi('ADMIN_UPDATE_MEMBER', { memberData: activeMember.value })) { alert('✅ 學員資料與備註已成功儲存！'); await fetchData(); } };
                const updateOrderAttendance = async (o) => { fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ADMIN_UPDATE_ORDER', payload: { orderId: o.orderId, attendance: o.attendance } }) }); };

                const openPointActionModal = (type) => { editingPointAction.value = { type: type, amount: '', reason: '' }; };
                const submitPointAction = async () => {
                    if (!editingPointAction.value.amount || editingPointAction.value.amount <= 0) return alert('請輸入有效的金額');
                    if (!editingPointAction.value.reason) return alert('請輸入異動原因');
                    if (!confirm(`確定要${editingPointAction.value.type==='MANUAL_ADD'?'發放':'扣除'} ${editingPointAction.value.amount} 點嗎？此操作不可逆。`)) return;
                    
                    const res = await callApi('ADMIN_MANAGE_POINTS', { uid: activeMember.value.userId, type: editingPointAction.value.type, amount: editingPointAction.value.amount, reason: editingPointAction.value.reason, operator: loginForm.value.account });
                    if (res && res.success) {
                        alert(`✅ 點數異動成功！\n最新餘額：${res.newBalance.toLocaleString()} 點`);
                        editingPointAction.value = null;
                        const pts = await callApi('GET_USER_POINTS', { targetUid: activeMember.value.userId });
                        if (pts) activeMemberPoints.value = pts;
                    }
                };

                const openEditModal = (c) => { 
                    const parsed = JSON.parse(JSON.stringify(c));
                    if(parsed.isPublished === undefined) parsed.isPublished = true;
                    if(parsed.isRegistrationOpen === undefined) parsed.isRegistrationOpen = true;
                    if(!parsed.targetTiers || !Array.isArray(parsed.targetTiers) || parsed.targetTiers.length === 0) parsed.targetTiers = ["一般會員", "喚醒階段會員", "蛻變階段會員", "完整階段會員"];
                    if(!parsed.discountRule) parsed.discountRule = 'NONE';
                    if(parsed.discountRule === '20%') parsed.discountRule = 'RULE_A';
                    if(parsed.discountRule === '50%') parsed.discountRule = 'RULE_B';
                    if(parsed.discountRule === '100%') parsed.discountRule = 'RULE_C';
                    if(!parsed.paymentMethod) parsed.paymentMethod = 'ALL';
                    editingCourse.value = parsed;
                };
                
                const saveCourse = async () => { if(await callApi('ADMIN_UPDATE_COURSE', editingCourse.value)) { editingCourse.value = null; await fetchData(); } };
                const syncToCalendar = async (c) => { if(!confirm(`確定要將「${c.name}」同步至 Google 日曆嗎？`)) return; const data = await callApi('ADMIN_SYNC_CALENDAR', { courseId: c.id }); if (data && data.success) { alert(data.message); await fetchData(); } };
                
                const copyCourse = (c) => { 
                    const parsed = JSON.parse(JSON.stringify(c)); 
                    parsed.id = 'NEW_' + Date.now().toString().slice(-4); parsed.name += ' (複製)'; 
                    if(parsed.isPublished === undefined) parsed.isPublished = true; 
                    if(parsed.isRegistrationOpen === undefined) parsed.isRegistrationOpen = true; 
                    if(!parsed.targetTiers || !Array.isArray(parsed.targetTiers)) parsed.targetTiers = ["一般會員", "喚醒階段會員", "蛻變階段會員", "完整階段會員"]; 
                    if(!parsed.discountRule) parsed.discountRule = 'NONE';
                    if(parsed.discountRule === '20%') parsed.discountRule = 'RULE_A';
                    if(parsed.discountRule === '50%') parsed.discountRule = 'RULE_B';
                    if(parsed.discountRule === '100%') parsed.discountRule = 'RULE_C';
                    if(!parsed.paymentMethod) parsed.paymentMethod = 'ALL';
                    editingCourse.value = parsed; 
                };
                
                const generateCheckinLink = async (course) => { if (!course.checkinPwd) return alert('請先輸入簽到密碼！'); if (await callApi('ADMIN_SET_CHECKIN_PWD', { courseId: course.id, checkinPwd: course.checkinPwd })) { const url = window.location.origin + window.location.pathname.replace('admin.html', 'checkin.html') + '?id=' + course.id; checkinUrl.value = url; } };
                const copyUrl = () => { if (!checkinUrl.value) return; navigator.clipboard.writeText(checkinUrl.value).then(() => alert('✅ 網址已複製成功！')).catch(() => { const dummy = document.createElement("input"); document.body.appendChild(dummy); dummy.setAttribute("value", checkinUrl.value); dummy.select(); document.execCommand("copy"); document.body.removeChild(dummy); alert('✅ 網址已複製成功！'); }); };
                const saveSettings = async () => { const res = await callApi('ADMIN_UPDATE_SETTINGS', sysSettings.value); if (res && res.success) alert('✅ 系統設定已儲存！'); };

                const handleFileUpload = (e) => {
                    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image(); img.onload = () => {
                            const canvas = document.createElement('canvas'); const MAX_WIDTH = 600; let width = img.width; let height = img.height;
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } canvas.width = width; canvas.height = height;
                            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); let quality = 0.5; let base64str = canvas.toDataURL('image/webp', quality);
                            while (base64str.length > 48000 && quality > 0.3) { quality -= 0.1; base64str = canvas.toDataURL('image/webp', quality); }
                            if (base64str.length > 49500) { alert('❌ 圖片依然過大，請改用「貼上網址」功能維持畫質。'); return; } editingCourse.value.image = base64str;
                        }; img.src = event.target.result;
                    }; reader.readAsDataURL(file);
                };

                const handleBannerUpload = (e) => {
                    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image(); img.onload = () => {
                            const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; let width = img.width; let height = img.height;
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } canvas.width = width; canvas.height = height;
                            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); let quality = 0.6; let base64str = canvas.toDataURL('image/webp', quality);
                            while (base64str.length > 48000 && quality > 0.3) { quality -= 0.1; base64str = canvas.toDataURL('image/webp', quality); }
                            if (base64str.length > 49500) { alert('❌ Banner 圖片過大，請上傳至外部空間後再貼上網址。'); return; } sysSettings.value.banner_image = base64str;
                        }; img.src = event.target.result;
                    }; reader.readAsDataURL(file);
                };

                return { 
                    isAuthenticated, loginForm, loginError, handleLogin, logout,
                    isLiffLoading, liffLogin, goToFrontend,
                    view, courses, orders, users, isLoading, editingCourse, editingOrder,
                    activeMember, activeEnrollmentCourse, checkinUrl, courseSearchQuery, courseFilterCategory, adminCategories, filteredAdminCourses,
                    orderSearchQuery, orderFilterCourse, orderFilterStatus, adminOrderCourses, filteredAdminOrders, sysSettings, 
                    activeMemberPoints, editingPointAction, getDiscountLabel,
                    courseOrders: computed(() => activeEnrollmentCourse.value ? orders.value.filter(o => o.courseId === activeEnrollmentCourse.value.id || o.courseId === activeEnrollmentCourse.value.name) : []), 
                    memberOrders: computed(() => activeMember.value ? orders.value.filter(o => o.userId === activeMember.value.userId).reverse() : []),
                    courseStatsFiltered,
                    openEditModal, openOrderEditModal, openMemberDetail, openEnrollments, 
                    saveOrderUpdate, saveMemberDetail, updateOrderAttendance, saveCourse, saveSettings, fetchData, currentViewName, statsSummary, formatPrice,
                    getCoursePaidCount: id => orders.value.filter(o => (o.courseId === id) && o.status === 'PAID').length, 
                    getCoursePendingCount: id => orders.value.filter(o => (o.courseId === id) && (o.status || 'PENDING') === 'PENDING').length, 
                    getCourseName, handleFileUpload, handleBannerUpload, copyCourse, runHealthCheck,
                    generateCheckinLink, copyUrl, triggerBackup, syncToCalendar, openPointActionModal, submitPointAction
                };
            }
        }).mount('#app');
    </script>
</body>
</html>
