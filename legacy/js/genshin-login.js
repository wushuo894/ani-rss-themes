/**
 * 原神启动 · 登录页三维背景 —— three.js 移植
 *
 * 把 alphardex/genshin-replica（《原神》登录页的 WebGL 复刻）搬到 ani-rss 的
 * 「自定义 JS」里。渐变天空、大云、云海、极光、星尘、体积雾、桥柱、无限延伸的
 * 路，以及那台一直往前推的相机，全部照搬上游的着色器与摆放数据。
 *
 * 上游：https://github.com/alphardex/genshin-replica          （MIT）
 * 原作：https://github.com/gamemcu/www-genshin
 * 着色器里的噪声与 ACES 取自 lygia（BSD-3 / MIT）与 three.js（MIT）。
 *
 * ── 两条硬约束 ────────────────────────────────────────────────────────────
 * 1. 只在登录页跑。检测到 #login-page 挂载才建场景，登录后立刻销毁 canvas 并
 *    释放 WebGL 上下文，列表页一点三维开销都不留。
 * 2. 资产只引用不转存。模型和贴图全部走 ASSET_BASE 热链上游仓库，本仓库不放
 *    任何米哈游的文件。
 *
 * ── 免责声明 ──────────────────────────────────────────────────────────────
 * 本文件是学习性质的技术复刻，非官方产品，与米哈游 / HoYoverse 无任何关联，
 * 不用于任何商业目的。所引用的模型、贴图版权归米哈游所有，本仓库既不转存也不
 * 分发，仅通过 ASSET_BASE 指向上游复刻仓库。若权利方认为此举不妥，把 ASSET_BASE
 * 置空或删除本文件即可，届时脚本自行退出。
 *
 * ── 装法 ──────────────────────────────────────────────────────────────────
 * ani-rss → 设置 → 基础设置 → 页面设置 → 自定义 → JS，填一行：
 *
 *   import("https://cdn.jsdelivr.net/gh/zzzwannasleep/ani-rss-themes@main/js/genshin-login.js")
 *
 * 或者把本文件全文粘进去。搭配 themes/ 里的原神主题 CSS 一起用效果最好；那份
 * CSS 若还留着 `body:has(#login-page)::after` 的静态壁纸，删掉它，否则会盖住
 * 这里的三维天空。
 *
 * ── 代价 ──────────────────────────────────────────────────────────────────
 * 首次进登录页要拉 three.js（约 600 KB）+ Draco 解码器（约 200 KB）+ 模型贴图
 * （约 3 MB），全部走 CDN 且能被浏览器缓存。移动网络上这不算便宜，介意就别装。
 * 系统开了「减弱动态效果」时脚本自动不启动。
 */
(function () {
    'use strict'

    /* ==================== 配置 ==================== */

    // 上游复刻仓库的资产目录。本仓库不转存米哈游的模型与贴图，只引用。
    const ASSET_BASE = 'https://cdn.jsdelivr.net/gh/alphardex/genshin-replica@main/public/Genshin/Login/'

    // three 锁 0.157.0：上游就是这个版本，光照口径（useLegacyLights）、
    // lights_fragment_begin 的函数签名都跟它绑死，换版本卡通光照会直接编译不过。
    const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.157.0'
    const THREE_URL = THREE_CDN + '/+esm'
    const GLTF_URL = THREE_CDN + '/examples/jsm/loaders/GLTFLoader.js/+esm'
    const DRACO_URL = THREE_CDN + '/examples/jsm/loaders/DRACOLoader.js/+esm'
    const DRACO_DECODER = THREE_CDN + '/examples/jsm/libs/draco/gltf/'

    const LOGIN_SEL = '#login-page'   // 登录页挂载点，见 ani-rss 的 Login.vue

    // 「忘记密码」指向的文档页。不想要这个链接就把它置空
    const FORGOT_URL = 'https://docs.wushuo.top/change-the-password'

    const CANVAS_Z = -50              // 压在主题 CSS 画的所有东西（最低 -40）后面

    const CAMERA_SPEED = 88           // 相机每秒前进多少世界单位
    const TOTAL_Z = 206000            // 场景在 Z 上的总长度，用于无限循环（原始坐标系）
    const SCALE = 0.1                 // 原始坐标 → 世界坐标
    const LOOP_Z = TOTAL_Z * SCALE

    /* ==================== 摆放数据 ====================
     * 来自上游 src/Experience/Data/{cloud,column,polarLight}.ts，
     * 只把用得上的字段压扁成平数组（云和极光的旋转、缩放上游本来就没用）。
     * 坐标仍是 Blender 的右手系，运行时再转成 three 的坐标。
     */

    const COLUMN_MODELS = [
        'SM_Qiao01', 'SM_Qiao02', 'SM_Qiao03', 'SM_Qiao04',
        'SM_ZhuZi01', 'SM_ZhuZi02', 'SM_ZhuZi03', 'SM_ZhuZi04',
    ]

    // 云：[x, y, z] × 324
    const CLOUD = [
        -60488.11,30484.8,-6891.07, -69542.77,101073.62,-6497.03, -44203.43,57784.28,-11918.68, -40366.7,181360.72,-11099.78,
        -72774.31,46232.82,-5950.02, -38697.31,102738.58,-13675.11, -39697.58,89473.2,-12885.07, -70576.63,98760.97,-5235.76,
        -11577.29,20967.52,-8495.39, -53051.34,58629.79,-8506.55, -40641.91,64329.8,-12371.39, -66843.48,29598.76,-6530.97,
        -42266.62,117846.26,-11546.74, -48705.39,101066.07,-10441.71, -49567.87,164044.48,-10240.23, -63117.21,134433.47,-8259.7,
        -38076.25,28385.15,-11646.58, -63856.56,63654.14,-6040.66, -47108.72,146434.25,-9769.75, -65756.09,55139.4,-8018.51,
        -66542.17,71700.15,-6776.74, -52955.52,118478.04,-8090.08, -46181.9,17829.44,-12024.75, -67787.98,101975.33,-7922.99,
        -70802.82,74705.08,-5455.59, -77337.82,42162.42,-3855.2, -58027.16,171653.22,-8907.79, -47533.1,65320.45,-10543.66,
        -78667.24,28819.17,-3939.7, -38111.49,79744.12,-11381.41, -61521.25,67721.06,-7865.11, -44977.68,8419.15,-12344.78,
        -41123.9,112317.79,-11020.36, -49029.45,153857.14,-10354.74, -47707.91,191223.48,-11574.64, -74357.59,77016.9,-6039,
        -60313.66,111327.62,-9280.09, -38888.7,158582.42,-13395.41, -64989.38,18268.15,-6906.12, -47702.64,29095.63,-11841.16,
        -37533.73,204645.06,-11568.07, -69394.3,30884.51,-7636.75, -68848.27,47398.38,-6964.8, -38732.76,43229.99,-11517.06,
        -73883.41,17287.79,-6478.6, -44755.27,58276.9,-9764.92, -39071.59,51918.05,-11078.43, -63274.73,40025.57,-8652.19,
        -62579.56,50923.39,-8502.23, -42790.08,51176.43,-11429.65, -53200.27,67074.03,-10203.15, -77784.38,5304.76,-4549.09,
        -49289.36,151485.28,-9629.62, -55640.91,190088.7,-10384.23, -53048.9,175399.2,-10796.56, -66006.77,86973.08,-6132.54,
        -43524.03,54104.23,-10704.03, -47088.84,80199.55,-9276.33, -77146.67,58302.61,-3942.77, -66249.42,15264.65,-6270.14,
        -64073.55,123106.3,-6906.44, -46229.73,130501.7,-10025.81, -82490.97,173482.25,-4353.31, -80608.41,144983.98,-2785.73,
        -86136.46,162263.17,-3370.05, -81995.86,158964.97,-2667.16, -81583.3,86139.34,-4563.59, -63542.82,191916.59,-8719.52,
        -84895.84,94419.38,-3594.49, -64876.92,181148.41,-6024.97, -67078.11,187838.31,-5642.94, -66333.29,171824.92,-7252.18,
        -84164.83,50794.71,-2514.12, -75747.9,93340.18,-5363.06, -86779.97,69595.43,-3190.09, -68075.7,160090,-6346.79,
        -81496.24,184704,-5170.39, -74364.87,125927.47,-6323.8, -76422.23,128279.49,-5181.54, -84114.8,78938.19,-3427.19,
        -80861.78,199222.39,-4110.07, -90903.52,80324.41,-1891.41, -65615.95,200893.42,-6966.11, -89984.97,193926.34,-2505.66,
        -79432.23,98348.16,-4836.16, -75866.27,166627.03,-6072.61, -61931.27,171435.47,-7012.51, -72609.31,157633.53,-6800.54,
        -71874.77,112376.08,-5185.22, -58272.69,194003.62,-8954.04, 33191.57,192969.95,-12168.99, 7729.77,203302.69,-12044.81,
        33448.5,124687.7,-14101.5, 10800.77,191961.03,-13088.45, 26776.67,124435.65,-13278.76, -6388.23,188151.53,-11936.83,
        33506.66,167310.17,-12751.26, 10470.86,124911.66,-12972.34, 21894.78,153700.95,-11352.8, 22500.16,104625.02,-11561.81,
        15021.9,161372.28,-13835.44, 35952.62,8960.45,-12680.23, 24983.55,169113.8,-11648.56, 7514.82,207115.61,-12237.57,
        36099.28,199031.14,-12898.27, 30087.89,181245.11,-11916.82, 34063.2,97968.63,-14079.71, 11050.82,106841.92,-13121.72,
        32327.57,102022.19,-12596.64, 8259.29,135051.55,-12240.78, 35508.52,194710.14,-14040.35, 13806.81,131640.5,-13873.88,
        11197.23,203040.88,-12422.76, 20678.98,92152.57,-13003.57, 27871.1,108478.56,-11428.55, 14984.64,203967.14,-12377.59,
        13265.85,139993.58,-13118.36, 31890.34,156823.81,-12186.07, 23321.93,190977.06,-13803.66, 10227.62,202461.75,-13626.81,
        24688.1,69232.33,-12567.72, 15203.11,188450.92,-11680.03, 36308.25,63836.87,-13727.8, 23746.79,206325.89,-12324.72,
        -11698.77,198823.94,-13880.06, 19291.59,81163.95,-13557.63, 16262.82,207534.09,-12083.66, 12134.07,147130.5,-12981.07,
        26012.87,138733.91,-11915.03, 3466.73,183045.06,-12574.12, 22092.25,188174.31,-13289.35, 36754.02,51818.83,-11973.36,
        8574.26,153492.7,-12620.78, 30644.81,186736.53,-13303.99, 35201.45,106908.62,-13286.81, 23851.34,78647.8,-12721.8,
        22179.39,167124.92,-13018.23, 31671.54,50759.5,-12471.26, 11813.79,143170.44,-13022.64, -34351.11,27696.56,-12688.82,
        21255.91,6485.1,-11217.7, -11208.84,102613.62,-13130.11, -33057.55,68809.81,-13096.83, 4234.78,51710.18,-11486.36,
        1667.21,71991.79,-14084.65, -3965.94,149901.31,-13356.85, -23668.09,192454.53,-13715.24, 34579.93,535.9,-12641.43,
        -12943,136305.36,-11375.42, -36129.8,179558.42,-11778.9, -21417.77,104294.96,-13669.01, 18684.31,43129.44,-13519.7,
        10694.96,31095.83,-8981.27, -29257.06,34978.15,-12890.62, -11700.69,128994.75,-12722.15, 26687.75,37564.85,-12873.88,
        -18283.91,68041.17,-12362.46, -23971.93,53742.49,-12644.83, 1813.69,101170.84,-12334.53, 201.05,132976.06,-13340.41,
        -109.44,27352.04,-13497.7, -29617.71,131991.28,-13137.96, -31325.67,166604.19,-13429.68, -34200.95,156391.66,-13779.88,
        7907.19,39106.35,-11793.36, -798.99,83786.37,-12406.34, -32995.72,124826.48,-11257.9, -8568.22,119949.73,-13907.59,
        -21707.48,89456.42,-11855.81, -13206.12,108514.83,-12494.31, -36359.77,147442.47,-14037.74, -20089.54,125311.23,-11847.36,
        -24227.66,206625,-11776.97, -10234.68,116258.25,-12829.23, -23368.36,114280.21,-13810.57, 22199.9,47657.26,-13026.88,
        -23635.01,28632.46,-11560.63, 6880.52,87265.32,-13670.87, -27647.29,86538.07,-13170.84, -27256.34,69600.05,-11908.02,
        -15893.25,60098.4,-11558.87, -33723.85,193627.64,-11240.45, -23819.21,76624.97,-8963.03, -8552.08,8124.37,-13352.17,
        -33068.69,127354.11,-12455.28, -3920.98,91168.34,-13107.18, -2587.8,125725.26,-11725.87, 886.14,134066.64,-13209.46,
        -16435.53,43916.24,-12313.7, -36057.67,34172.8,-12659.07, -35375.84,181701.91,-11995.58, -10987.94,50148.55,-11494.02,
        -7678.29,38058.29,-12141.72, 6170.16,48239.19,-13554.11, 2379.64,25611.57,-12964.82, -1434.87,118983.62,-13924.93,
        -17754.98,71741.3,-12472.83, -4099.07,83695.23,-13730.07, -19459.88,121049.45,-12919.22, 6969.36,32893.25,-12802.75,
        -6095.34,96087.12,-12933.86, -32797.46,71242.98,-13183.81, 16729.79,11503.73,-12044.45, -15198.83,103351.99,-12469.89,
        -22466.19,192079.95,-13829.65, -1313.15,99086.27,-12820.38, -36871.18,185380.89,-12529.57, -35360.94,7367.01,-11563.04,
        -12880.47,169898.52,-12104.35, -26283.14,114315.76,-12690.22, 26090.14,1625.05,-12106.72, 17351.56,62470.75,-13134.32,
        -21606.88,101088.28,-12209.65, -175.6,51561.08,-9890.27, 20253.86,20200.81,-13226.5, -7315.29,38971.62,-11814.78,
        -34409.87,153439.33,-12254.19, -22889.51,195137.83,-13730.26, -13531.78,44644.05,-13348.08, -26576.53,28506.67,-12224.74,
        -9095.18,57368.46,-12946.71, -12337.18,52056.7,-12155.97, -17948.2,33375.7,-13310.51, -1353.68,31655.12,-13855.3,
        7224.22,104272.54,-13626.86, 71511.45,107899.02,-7124.28, 72810.08,49857.28,-6531.54, 64592.77,101436.56,-7718.37,
        73622.58,51558.74,-6659.51, 43200.82,18227.13,-12499.23, 82170.21,124002.15,-3823, 57687.3,6002.62,-8528.15,
        66682.44,62333.83,-6221.65, 52207.59,65898.03,-9726.31, 62883.23,20746.46,-6422.84, 71609.9,168502.23,-4851.04,
        67136.91,65582.41,-5919.14, 75239.44,110216.45,-6259.59, 56903.44,75679.29,-8625.17, 82051.9,-1572.71,-3188.19,
        70423.33,94955.27,-6042.19, 72738.38,131873.92,-4846.06, 59108.46,77306.6,-9113.93, 58786.59,93678.12,-7196.81,
        89295.12,11261.52,-3815.04, 61955.38,52479.84,-7401.91, 63051.84,96387.06,-8603.96, 83699.05,64346.81,-1973.48,
        85843.8,204874.86,-1584.47, 70186.14,69562.7,-5121.26, 85904.45,171221.14,-3911.47, 49979.89,36179.12,-11089.29,
        70919.38,173793.12,-6153.13, 83566.2,136606.17,-3045.27, 87411.4,5028.76,-3804.73, 76811.52,2662.42,-5780.75,
        58347.78,980.65,-7687.67, 75660.41,9705.05,-5236.76, 80207.13,24260.02,-3198.18, 46530.74,30774.18,-10716.83,
        68274.11,69517.43,-7040.79, 88295.8,143629.58,-1557.17, 72078.51,161115.12,-4719.27, 74671.67,130453.27,-4800.87,
        77906.59,145324.61,-3230.64, 42864.79,10651.66,-10540.39, 65980.25,79478.13,-6033.32, 82617.17,120626.51,-2973.77,
        89755.86,50612.07,-1160.1, 91043.76,77887.8,-2530.57, 90599.33,109670.28,-2722.52, 90479.91,120468.84,-3154.9,
        71373.92,180298.23,-4948.31, 65874.48,33575.15,-7683.76, 62643.75,90847.28,-8991.11, 81936.69,37121.51,-3387.95,
        45169.82,791.72,-12092.89, 77392.2,110209.6,-5039, 79861.74,102198.28,-5329.04, 62561.84,12948.66,-7417.93,
        89089.84,112020.41,-2143.84, 56783.67,48000,-9931.19, 69571.55,57019.32,-6273.75, 80563.8,113249.64,-4021.71,
        86451.38,38681.21,-2109.67, 75966.5,80977.07,-4593.61, 42461.85,-2206.48,-10773.84, 66021.14,180875.58,-6845.62,
        44038.62,115115.38,-9916.46, 65524.25,173954.56,-6129.65, 49752.55,78332.03,-9069.02, 63932.05,150056.62,-8121.16,
        37629.06,99027.16,-13346.15, 43775.45,156398.53,-9922.48, 36576.96,23631.96,-7747.9, 45697.84,147818.84,-11227.14,
        49266.07,175812.95,-8835, 50142.55,169308.12,-10517.14, 45726.14,195604.75,-10526.59, 54675.18,149483.39,-7877.56,
        69604.1,181135.42,-6380.36, 44948.47,176907.08,-11097.99, 39166.82,61122.98,-10930.74, 44173.32,143495.72,-10092.98,
        62606.25,167094.27,-8288.03, 52247.95,102230.37,-8862.07, 46775.55,194146.84,-11945.28, 40302,56987.04,-10790.31,
        59000.56,126305.89,-9596.36, 55809.79,206690.89,-8221.55, 40529.25,200411.97,-11612.78, 54145.5,113944.23,-9723.22,
        46014.91,133397.47,-10047.7, 57505.39,140903.88,-9929.23, 46285.07,117698.52,-9400.18, 58556.93,207930.09,-8139.21,
        67890.2,177279.2,-7288.58, 61931.2,188274.8,-7540.75, 53601.83,108660.44,-9249.3, 60339.25,194334.88,-8445.55,
        60801.77,180457.8,-7048.52, 53743.35,182143.38,-10774.65, 7154.81,13400.49,-9534.17, -7615.13,110930.13,-9485.18,
    ]

    // 柱子/桥：[模型序号, x, y, z, 绕 Y 旋转, 缩放] × 148
    const COLUMN = [
        0,-3259.54,55909.38,-8971.05,-3.26,0.8, 1,-9677.17,56694.38,-8971.05,-3.26,7.57, 1,-16160.93,57487.46,-8971.05,-3.26,7.57,
        4,-19991.23,57955.97,-12244.69,-3.26,7.49, 0,19413.68,26615.11,-9828.82,-5.34,0.8, 1,6706.94,30988.29,-9828.82,-5.34,7.57,
        1,10552.28,36268.59,-9828.82,-5.34,7.57, 0,16803.78,85760.77,-9828.82,-2.88,0.8, 1,10555.82,84097.91,-9828.82,-2.88,7.57,
        4,-18525.85,69364.14,-12612.54,0,9.76, 4,-4961.68,77231.14,-16825.37,0,7.57, 4,-28871.62,103671.23,-11160.32,0,7.57,
        4,18490.02,38575.96,-18797.49,-3.22,10.6, 4,13441.07,68078.86,-31761.5,0,16.33, 4,13322.26,94559.95,-14267.74,-2.85,7.57,
        4,4877.59,7859.61,-8885.87,0,7.57, 4,-47983.31,98522.4,-21724.87,0,7.57, 4,-4796.11,14035.09,-10501.75,2.73,5.52,
        0,-3259.54,154108.7,-9828.82,-3.26,0.8, 1,-9677.17,154893.7,-9828.82,-3.26,7.57, 1,-16160.93,155686.78,-9828.82,-3.26,7.57,
        4,-19991.23,156155.3,-9828.82,-3.26,5.52, 0,7277.17,116763.12,-9828.82,-5.34,0.8, 1,11083.29,121989.55,-9828.82,-5.34,7.57,
        1,14928.63,127269.85,-9828.82,-5.34,7.57, 0,25034.26,183082.17,-9828.82,-2.88,0.8, 1,18786.29,181419.3,-9828.82,-2.88,7.57,
        4,-18525.85,167563.45,-12612.54,0,9.76, 4,21543.86,202600.36,-11815.69,0,7.57, 4,-28871.62,201870.55,-11160.32,0,7.57,
        4,27176.13,183971.92,-13077.91,0,7.57, 4,9400.02,134814.62,-17395.76,-3.22,10.6, 4,13441.07,166278.17,-33032.77,0,16.33,
        4,21552.73,191881.36,-14267.74,-2.85,7.57, 4,4877.59,106058.93,-13314.7,0,7.57, 4,-14183.06,121644.65,-13454.14,3.1,7.57,
        4,-47983.31,196721.72,-21724.87,0,7.57, 1,12424.48,53632.54,-8836.33,-0.14,7.57, 1,5957.73,54554.15,-8836.33,-0.14,7.57,
        5,16131.76,53104.19,-15754.45,-0.14,12.56, 1,20564.82,21186.92,-12093.55,-0.19,7.57, 1,14154.31,22441.3,-12093.55,-0.19,7.57,
        6,14190.16,22434.29,-9103.71,-0.19,4.16, 5,-24156.43,48468.04,-11681.44,-0.19,7.57, 5,12409.99,39026.4,-9229.88,-0.19,7.57,
        5,13072.63,15697.74,-9052.71,-0.19,7.57, 1,-20425.44,93584.4,-12093.55,-3.04,7.57, 1,-13926.08,94237.45,-12093.55,-3.04,7.57,
        5,-24151.42,93210.02,-10667.05,-3.04,7.57, 6,-13962.42,94233.8,-9103.71,-3.04,4.16, 1,-12631.35,83666.99,-6470.84,-3.84,7.57,
        1,-7632.57,79462.19,-6470.84,-3.84,7.57, 1,-43669.46,107924.12,-12093.55,-5.12,7.57, 1,-46243.29,101920.48,-12093.55,-5.12,7.57,
        5,24239.87,20467.79,-10667.05,-0.19,7.57, 1,12899.75,150950.73,-9694.1,-0.19,7.57, 1,6489.23,152205.14,-9694.1,-0.19,7.57,
        5,-7462.1,173587.48,-13131.17,-0.19,12.3, 1,28685.56,121142.08,-12093.55,-0.19,7.57, 1,22275.04,122396.45,-12093.55,-0.19,7.57,
        6,22310.89,122389.44,-9103.71,-0.19,4.16, 5,-46214.1,154239.41,-11681.44,-0.19,7.57, 5,16786.33,130027.66,-6284.35,-0.19,7.57,
        5,21461.64,110428.16,-12232.26,-0.19,10.35, 1,-20425.44,191783.73,-12093.55,-3.04,7.57, 1,-13926.08,192436.77,-12093.55,-3.04,7.57,
        5,-24151.42,191409.36,-10667.05,-3.04,7.57, 6,-13962.42,192433.11,-9103.71,-3.04,4.16, 1,-15131.77,180023.33,-7205.48,-3.84,7.57,
        1,-10132.99,175818.53,-7205.48,-3.84,7.57, 1,-43669.46,206123.42,-12093.55,-5.12,7.57, 1,-46243.29,200119.8,-12093.55,-5.12,7.57,
        5,32360.61,120422.95,-10667.05,-0.19,7.57, 5,-10041.13,151780.16,-4538.24,-0.19,4.36, 5,-15583.6,24915.45,-16764.29,-0.19,11.01,
        5,-5821.24,114219,-14220.5,-0.19,8.77, 5,18945.66,86650.52,-13077.91,-0.14,11.02, 3,-6615.05,35478.82,-10267.71,0,7.57,
        3,21913.41,38149.66,-4688.34,-3.22,7.57, 3,25049.79,37910.36,-4688.34,-3.22,7.57, 3,-12802.35,69364.13,-7371,0,7.57,
        3,-15947.84,69364.14,-7371,0,7.57, 3,7843.3,92904.8,-9026.2,-2.85,7.57, 3,10854.39,93814.42,-9026.2,-2.85,7.57,
        3,-9760.54,35478.82,-10267.71,0,7.57, 3,-12802.35,69364.13,-7371,0,7.57, 3,-15947.84,69364.14,-7371,0,7.57,
        3,-10147.13,133691.66,-6631.95,0,7.57, 3,3693.11,135250.05,-4688.34,-3.22,7.57, 3,6829.48,135010.75,-4688.34,-3.22,7.57,
        3,-12802.35,167563.45,-7371,0,7.57, 3,-15947.84,167563.45,-7371,0,7.57, 3,16073.78,190226.2,-9026.2,-2.85,7.57,
        3,19084.87,191135.83,-9026.2,-2.85,7.57, 3,-13292.62,133691.66,-6631.95,0,7.57, 3,-12802.35,167563.45,-7371,0,7.57,
        3,-15947.84,167563.45,-7371,0,7.57, 3,10601.09,7859.6,-3644.34,0,7.57, 3,-21301.37,25171.66,-3783.78,3.1,7.57,
        3,-18159.03,25030.85,-3783.78,3.1,7.57, 6,-23313.97,25261.84,-22485.36,3.1,7.57, 3,-19169.94,48441.03,-3644.34,0,7.57,
        3,-22315.43,48441.03,-3644.34,0,7.57, 6,-17155.32,48441.03,-22345.92,0,7.57, 3,7455.6,7859.6,-3644.34,0,7.57,
        3,10601.09,106058.93,-3644.34,0,7.57, 3,-19900.83,121900.85,-3783.78,3.1,7.57, 3,-16758.5,121760.05,-3783.78,3.1,7.57,
        6,-21913.43,121991.04,-22485.36,3.1,7.57, 3,-41227.61,154212.38,-3644.34,0,7.57, 3,-44373.1,154212.39,-3644.34,0,7.57,
        6,-39213,154212.38,-22345.92,0,7.57, 3,7455.6,106058.93,-3644.34,0,7.57, 2,-8441.4,11828.74,-4585.22,3.69,7.57,
        2,-5816.18,13430.53,-4585.22,3.69,7.57, 2,-11060.07,10230.94,-4585.22,3.69,7.57, 2,-21684.16,67868.18,-1523.6,3.56,16.79,
        2,-15456.73,70656.77,-1523.6,3.56,16.79, 2,-35647.27,65416.07,-1523.6,3.56,16.79, 2,-22937.42,82841.48,-8660.21,5.63,16.79,
        2,-28350.31,86995.72,-8660.21,5.63,16.79, 2,-12151.61,74563.68,-8660.21,5.63,16.79, 2,-17564.5,78717.92,-8660.21,5.63,16.79,
        2,-1365.8,66285.88,-8660.21,5.63,16.79, 2,-6778.69,70440.12,-8660.21,5.63,16.79, 2,9420.01,58008.08,-8660.21,5.63,16.79,
        2,4007.12,62162.32,-8660.21,5.63,16.79, 2,-10240.84,111312.08,-5504.83,3.69,7.57, 2,-7615.61,112913.88,-5504.83,3.69,7.57,
        2,-12859.51,109714.29,-5504.83,3.69,7.57, 2,-21684.16,166067.5,-1523.6,3.56,16.79, 2,-15456.73,168856.08,-1523.6,3.56,16.79,
        2,-35647.27,163615.41,-1523.6,3.56,16.79, 2,-22937.42,181040.8,-8660.21,5.63,16.79, 2,-28350.31,185195.05,-8660.21,5.63,16.79,
        2,-12151.61,172763,-8660.21,5.63,16.79, 2,-17564.5,176917.23,-8660.21,5.63,16.79, 2,-1365.8,164485.2,-8660.21,5.63,16.79,
        2,-6778.69,168639.44,-8660.21,5.63,16.79, 2,9420.01,156207.41,-8660.21,5.63,16.79, 2,4007.12,160361.66,-8660.21,5.63,16.79,
        7,-4725.46,35505.06,-22840.58,0,7.57, 7,-10787.73,69364.13,-26072.59,0,7.57, 7,5914.76,92322.2,-27727.79,-2.85,7.57,
        7,-8132.51,133691.66,-25333.54,0,7.57, 7,-10787.73,167563.45,-26072.59,0,7.57, 7,14145.23,189643.61,-27727.79,-2.85,7.57,
        7,5676.85,35604.1,-19298.23,0,7.57,
    ]

    // 极光：[x, y, z] × 3
    const POLAR = [
        39188.92,26406.37,41612.57, 38546.52,180333.61,43235.39, 47130.91,101574.17,48893.04,
    ]

    /* ==================== 着色器 ====================
     * 全部照抄上游 src/Experience/Shaders/，只把 #include 展开成字符串拼接
     * （原项目靠 vite-plugin-glsl 在构建期做这件事，这里没有构建期）。
     */

    // ACES 色彩变换。整条管线的关键：各个自定义材质先用 ACES_Inv 把颜色反变换
    // 到 ACES 空间输出，等所有半透明图层混合完，最后一道全屏 pass 再正变换回来。
    // 反变换必须留在材质里、正变换必须留在最后，颠倒顺序高光就不会那样滚落成白。
    const ACES = /* glsl */ `
    vec3 rrt_odt_fit(vec3 v){
        vec3 a=v*(v+.0245786)-.000090537;
        vec3 b=v*(.983729*v+.4329510)+.238081;
        return a/b;
    }
    vec3 inv_rrt_odt_fit(vec3 v){
        vec3 a=-(sqrt(10.)*sqrt((-187248350.*pow(v,vec3(2.)))+232585567.*v+241290.)+21650.*v-1230.);
        vec3 b=(98370.*v-100000.);
        return a/b;
    }
    mat3 mat3_from_rows(vec3 c0,vec3 c1,vec3 c2){
        return transpose(mat3(c0,c1,c2));
    }
    vec3 aces_fitted(vec3 color){
        mat3 m_in=mat3_from_rows(vec3(.59719,.35458,.04823),vec3(.07600,.90834,.01566),vec3(.02840,.13383,.83777));
        mat3 m_out=mat3_from_rows(vec3(1.60475,-.53108,-.07367),vec3(-.10208,1.10813,-.00605),vec3(-.00327,-.07276,1.07602));
        color=m_in*color;
        color=rrt_odt_fit(color);
        color=m_out*color;
        return color;
    }
    vec3 ACES_Inv(vec3 color){
        mat3 m_in=mat3_from_rows(vec3(1.76474,-.67577,-.08896),vec3(-.14702,1.16025,-.01322),vec3(-.03633,-.16243,1.19877));
        mat3 m_out=mat3_from_rows(vec3(.64304,.31119,.04578),vec3(.05926,.93144,.00929),vec3(.00596,.06393,.93012));
        color=m_out*color;
        color=inv_rrt_odt_fit(color);
        color=m_in*color;
        return color;
    }
    `

    // lygia/generative/random.glsl（非 SINLESS 分支）
    const RANDOM = /* glsl */ `
    float random(in vec2 st){
        return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453);
    }
    float random(in vec3 pos){
        return fract(sin(dot(pos.xyz,vec3(70.9898,78.233,32.4355)))*43758.5453123);
    }
    `

    // lygia/generative/cnoise.glsl 的 vec3 重载 + 它依赖的四个小函数
    const CNOISE = /* glsl */ `
    vec3 mod289(const in vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(const in vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(const in vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(in vec4 r){return 1.79284291400159-0.85373472095314*r;}
    vec3 quintic(const in vec3 v){return v*v*v*(v*(v*6.0-15.0)+10.0);}

    float cnoise(in vec3 P){
        vec3 Pi0=floor(P);
        vec3 Pi1=Pi0+vec3(1.0);
        Pi0=mod289(Pi0);
        Pi1=mod289(Pi1);
        vec3 Pf0=fract(P);
        vec3 Pf1=Pf0-vec3(1.0);
        vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
        vec4 iy=vec4(Pi0.yy,Pi1.yy);
        vec4 iz0=Pi0.zzzz;
        vec4 iz1=Pi1.zzzz;

        vec4 ixy=permute(permute(ix)+iy);
        vec4 ixy0=permute(ixy+iz0);
        vec4 ixy1=permute(ixy+iz1);

        vec4 gx0=ixy0*(1.0/7.0);
        vec4 gy0=fract(floor(gx0)*(1.0/7.0))-0.5;
        gx0=fract(gx0);
        vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);
        vec4 sz0=step(gz0,vec4(0.0));
        gx0-=sz0*(step(0.0,gx0)-0.5);
        gy0-=sz0*(step(0.0,gy0)-0.5);

        vec4 gx1=ixy1*(1.0/7.0);
        vec4 gy1=fract(floor(gx1)*(1.0/7.0))-0.5;
        gx1=fract(gx1);
        vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);
        vec4 sz1=step(gz1,vec4(0.0));
        gx1-=sz1*(step(0.0,gx1)-0.5);
        gy1-=sz1*(step(0.0,gy1)-0.5);

        vec3 g000=vec3(gx0.x,gy0.x,gz0.x);
        vec3 g100=vec3(gx0.y,gy0.y,gz0.y);
        vec3 g010=vec3(gx0.z,gy0.z,gz0.z);
        vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
        vec3 g001=vec3(gx1.x,gy1.x,gz1.x);
        vec3 g101=vec3(gx1.y,gy1.y,gz1.y);
        vec3 g011=vec3(gx1.z,gy1.z,gz1.z);
        vec3 g111=vec3(gx1.w,gy1.w,gz1.w);

        vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
        g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
        vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
        g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;

        float n000=dot(g000,Pf0);
        float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
        float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));
        float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
        float n001=dot(g001,vec3(Pf0.xy,Pf1.z));
        float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
        float n011=dot(g011,vec3(Pf0.x,Pf1.yz));
        float n111=dot(g111,Pf1);

        vec3 fade_xyz=quintic(Pf0);
        vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
        vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
        float n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);
        return 2.2*n_xyz;
    }
    `

    // Shaders/Common/vert.glsl —— 大云、极光、体积雾共用
    const COMMON_VERT = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main(){
        vec3 p=position;

        #ifdef USE_INSTANCING
        p=vec3(instanceMatrix*vec4(p,1.));
        #endif

        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);

        vUv=uv;
        vUv.y=1.-uv.y;
        vWorldPosition=vec3(modelMatrix*vec4(p,1));
    }
    `

    const SHADERS = {
        // ---- 渐变天空。全屏 NDC 四边形，最先画且不写深度 ----
        gradientFrag: /* glsl */ `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uStop1;
        uniform float uStop2;

        varying vec2 vUv;

        ${ACES}

        void main(){
            vec2 uv=vUv;
            vec3 col=vec3(0.);
            float y=1.-uv.y;
            float mask1=1.-smoothstep(0.,uStop1,y);
            float mask2=smoothstep(0.,uStop1,y)*(1.-smoothstep(uStop1,uStop2,y));
            float mask3=smoothstep(uStop1,uStop2,y);
            col+=uColor1*mask1;
            col+=uColor2*mask2;
            col+=uColor3*mask3;
            col=ACES_Inv(col);
            gl_FragColor=vec4(col,1.);
        }
        `,

        // ---- 云海。实例化平面，靠扭曲 UV 在一张 2×4 的图集里随机取一朵 ----
        cloudVert: /* glsl */ `
        ${RANDOM}

        varying vec2 vUv;
        varying vec3 vWorldPosition;

        vec2 distortUV(vec2 uv,vec2 offset){
            vec2 wh=vec2(2.,4.);
            uv/=wh;
            float rn=ceil(random(offset)*wh.x*wh.y);
            vec2 cell=vec2(1.,1.)/wh;
            uv+=vec2(cell.x*mod(rn,wh.x),cell.y*(ceil(rn/wh.x)-1.));
            return uv;
        }

        void main(){
            vec3 p=position;

            #ifdef USE_INSTANCING
            p=vec3(instanceMatrix*vec4(p,1.));
            vec3 instPosition=vec3(instanceMatrix*vec4(vec3(0.),1.));
            #else
            vec3 instPosition=vec3(0.);
            #endif

            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);

            vUv=distortUV(uv,instPosition.xy);
            vWorldPosition=vec3(modelMatrix*vec4(p,1));
        }
        `,
        cloudFrag: /* glsl */ `
        ${ACES}

        uniform sampler2D uTexture;
        uniform vec3 uColor1;
        uniform vec3 uColor2;

        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main(){
            vec4 tex=texture(uTexture,vUv);
            vec3 col=uColor1;
            col=mix(col,uColor2,pow(tex.r,.6));
            col=ACES_Inv(col);
            gl_FragColor=vec4(col,tex.a);
        }
        `,

        // ---- 远处那几团大云。整组跟着相机走，所以永远在天边 ----
        bigCloudFrag: /* glsl */ `
        ${ACES}

        uniform sampler2D uTexture;

        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main(){
            vec4 tex=texture(uTexture,vUv);
            vec3 col=vec3(.090,.569,.980);
            col=mix(col,vec3(.93),vec3(pow(tex.r,.4)));
            col=ACES_Inv(col);
            gl_FragColor=vec4(col,tex.a);
        }
        `,
        bigCloudBgFrag: /* glsl */ `
        uniform sampler2D uTexture;

        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main(){
            vec4 tex=texture(uTexture,vUv);
            gl_FragColor=vec4(vec3(1.8),tex.r*.4);
        }
        `,

        // ---- 极光。两层错速滚动的贴图叠加，离相机越近越淡 ----
        polarFrag: /* glsl */ `
        uniform float iTime;
        uniform sampler2D uTexture;

        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main(){
            vec2 uv=vUv;

            float mask=1.5*texture(uTexture,uv+vec2(iTime*.015,0.)).r;
            mask+=texture(uTexture,uv*vec2(.4,1.)+vec2(iTime*-.0075,0.)).r;

            float alpha=mask;

            float mask1=1.;
            mask1*=smoothstep(0.,.5,uv.y);
            mask1*=smoothstep(0.,.1,uv.x);
            mask1*=smoothstep(1.,.9,uv.x);
            alpha*=mask1;

            float distanceToCamera=distance(cameraPosition,vWorldPosition);
            alpha*=smoothstep(200.,1000.,distanceToCamera);

            gl_FragColor=vec4(vec3(1.8),alpha);
        }
        `,

        // ---- 星尘 ----
        starVert: /* glsl */ `
        ${RANDOM}

        uniform float iTime;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 aRandom;

        varying vec3 vRandom;

        vec3 distort(vec3 p){
            float seed=random(aRandom);
            float strength=500.;
            float t=sin(iTime*(.1*seed));
            p.x+=(seed-.5)*2.*strength;
            p.y+=(seed-.8)*2.*strength;
            p.z+=((seed-.5)*2.*t+seed)*strength;
            return p;
        }

        void main(){
            vec3 p=distort(position);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);

            gl_PointSize=uPointSize*uPixelRatio;
            vec4 mvPosition=modelViewMatrix*vec4(p,1.);
            gl_PointSize*=(1./-mvPosition.z);

            vRandom=aRandom;
        }
        `,
        starFrag: /* glsl */ `
        ${RANDOM}

        uniform float iTime;
        uniform sampler2D uTexture;

        varying vec3 vRandom;

        void main(){
            vec2 uv=gl_PointCoord;

            float seed=random(vRandom);
            float randId=floor(seed*3.)/3.;
            float mask=texture(uTexture,vec2(uv.x/3.+randId,uv.y)).r;

            vec3 col=vRandom+.5;

            float alpha=mask;
            alpha*=smoothstep(0.,.2,sin(iTime*(1.2*seed+.4)+seed)-.8);

            gl_FragColor=vec4(col,alpha);
        }
        `,

        // ---- 贴着路面那层雾。两层柏林噪声反向漂移，再按世界坐标裁出形状 ----
        fogFrag: /* glsl */ `
        ${CNOISE}
        #define saturate(x) clamp(x,0.0,1.0)

        uniform float iTime;

        varying vec2 vUv;
        varying vec3 vWorldPosition;

        float getNoise(vec3 p){
            float noise=0.;

            noise=saturate(cnoise(p*vec3(.012,.012,0.)+vec3(iTime*.25))+.2);
            noise+=saturate(cnoise(p*vec3(.004,.004,0.)-vec3(iTime*.15))+.1);

            noise=saturate(noise);

            noise*=(1.-smoothstep(-5.,45.,p.y));
            noise*=(smoothstep(-200.,-35.,p.y));

            noise*=(smoothstep(0.,40.,p.x)+(1.-smoothstep(-40.,-0.,p.x)));

            return noise;
        }

        void main(){
            gl_FragColor=vec4(vec3(3.),getNoise(vWorldPosition)*.3);
        }
        `,

        // ---- 最后一道：把 HDR 缓冲 ACES 正变换到屏幕 ----
        // 和 three 的 ACESFilmicToneMapping 逐字一致（postprocessing 的
        // ToneMappingEffect 走的就是它），/0.6 那个曝光系数不能省，上游的配色
        // 是在带着它的前提下调出来的。
        finalVert: /* glsl */ `
        varying vec2 vUv;
        void main(){
            vUv=uv;
            gl_Position=vec4(position,1.);
        }
        `,
        finalFrag: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uExposure;

        varying vec2 vUv;

        vec3 RRTAndODTFit(vec3 v){
            vec3 a=v*(v+0.0245786)-0.000090537;
            vec3 b=v*(0.983729*v+0.4329510)+0.238081;
            return a/b;
        }

        void main(){
            vec3 color=texture(tDiffuse,vUv).rgb;

            const mat3 m_in=mat3(
                0.59719,0.07600,0.02840,
                0.35458,0.90834,0.13383,
                0.04823,0.01566,0.83777);
            const mat3 m_out=mat3(
                1.60475,-0.10208,-0.00327,
                -0.53108,1.10813,-0.07276,
                -0.07367,-0.00605,1.07602);

            color*=uExposure/0.6;
            color=m_in*color;
            color=RRTAndODTFit(color);
            color=m_out*color;

            gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
        }
        `,
    }

    // 改写 MeshStandardMaterial 的直接光照，换成上游那套阶梯化的卡通光。
    // 这些片段依赖 three r157 里 lights_fragment_begin 的变量名，换版本会挂。
    const TOON_CHUNKS = {
        // 柱子/桥：阶梯漫反射 + 一层近似菲涅尔外发光
        columnDirect: /* glsl */ `
        void RE_Direct_ToonPhysical(const in IncidentLight directLight,const in vec3 geometryPosition,const in vec3 geometryNormal,const in vec3 geometryViewDir,const in vec3 geometryClearcoatNormal,const in PhysicalMaterial material,inout ReflectedLight reflectedLight,const in float metalnessFactor){
            float dotNL_noSaturate=dot(geometryNormal,directLight.direction);
            float dotNL=saturate(dotNL_noSaturate);
            float dotNL_toon=smoothstep(.25,.27,dotNL);
            vec3 irradiance=dotNL_toon*directLight.color;

            float new_roughness=(1.-step(.01,metalnessFactor))*pow(material.roughness,.4);
            new_roughness+=step(.01,metalnessFactor)*pow(material.roughness,1.4);
            PhysicalMaterial new_material=material;
            new_material.roughness=new_roughness;

            reflectedLight.directSpecular+=irradiance*BRDF_GGX(directLight.direction,geometryViewDir,geometryNormal,new_material);
            reflectedLight.directDiffuse+=irradiance*BRDF_Lambert(new_material.diffuseColor);

            float dotNL_reflect_faker=1.-smoothstep(0.,.3,dotNL_noSaturate);
            float fresnelTerm=dot(geometryViewDir,geometryNormal);
            fresnelTerm=saturate(1.-fresnelTerm)*dotNL_reflect_faker;
            vec3 fresnelCol=vec3(.333,.902,3.418);
            reflectedLight.directDiffuse+=fresnelCol*pow(fresnelTerm,4.5)*.8;
        }
        `,
        // 路面：两级台阶，没有外发光
        roadDirect: /* glsl */ `
        void RE_Direct_ToonPhysical(const in IncidentLight directLight,const in vec3 geometryPosition,const in vec3 geometryNormal,const in vec3 geometryViewDir,const in vec3 geometryClearcoatNormal,const in PhysicalMaterial material,inout ReflectedLight reflectedLight,const in float metalnessFactor){
            float dotNL_noSaturate=dot(geometryNormal,directLight.direction);
            float dotNL=saturate(dotNL_noSaturate);
            float dotNL_toon=smoothstep(.25,.27,dotNL)*pow(dotNL,.5)*1.4;
            dotNL_toon+=smoothstep(.75,.8,dotNL)*pow(dotNL,1.);
            vec3 irradiance=dotNL_toon*directLight.color;

            float new_roughness=(1.-metalnessFactor)*pow(material.roughness,.4);
            new_roughness+=metalnessFactor*pow(material.roughness,1.2);
            PhysicalMaterial new_material=material;
            new_material.roughness=new_roughness;

            reflectedLight.directSpecular+=irradiance*BRDF_GGX(directLight.direction,geometryViewDir,geometryNormal,new_material);
            reflectedLight.directDiffuse+=irradiance*BRDF_Lambert(new_material.diffuseColor);
        }
        `,
        // three r157 的 lights_fragment_begin，只把平行光那支的 RE_Direct 换掉
        lightsBegin: /* glsl */ `
        vec3 geometryPosition=-vViewPosition;
        vec3 geometryNormal=normal;
        vec3 geometryViewDir=(isOrthographic)?vec3(0,0,1):normalize(vViewPosition);
        vec3 geometryClearcoatNormal;
        #ifdef USE_CLEARCOAT
        geometryClearcoatNormal=clearcoatNormal;
        #endif
        #ifdef USE_IRIDESCENCE
        float dotNVi=saturate(dot(normal,geometryViewDir));
        if(material.iridescenceThickness==0.){
            material.iridescence=0.;
        }else{
            material.iridescence=saturate(material.iridescence);
        }
        if(material.iridescence>0.){
            material.iridescenceFresnel=evalIridescence(1.,material.iridescenceIOR,dotNVi,material.iridescenceThickness,material.specularColor);
            material.iridescenceF0=Schlick_to_F0(material.iridescenceFresnel,1.,dotNVi);
        }
        #endif
        IncidentLight directLight;
        #if(NUM_POINT_LIGHTS>0)&&defined(RE_Direct)
        PointLight pointLight;
        #if defined(USE_SHADOWMAP)&&NUM_POINT_LIGHT_SHADOWS>0
        PointLightShadow pointLightShadow;
        #endif
        #pragma unroll_loop_start
        for(int i=0;i<NUM_POINT_LIGHTS;i++){
            pointLight=pointLights[i];
            getPointLightInfo(pointLight,geometryPosition,directLight);
            #if defined(USE_SHADOWMAP)&&(UNROLLED_LOOP_INDEX<NUM_POINT_LIGHT_SHADOWS)
            pointLightShadow=pointLightShadows[i];
            directLight.color*=(directLight.visible&&receiveShadow)?getPointShadow(pointShadowMap[i],pointLightShadow.shadowMapSize,pointLightShadow.shadowBias,pointLightShadow.shadowRadius,vPointShadowCoord[i],pointLightShadow.shadowCameraNear,pointLightShadow.shadowCameraFar):1.;
            #endif
            RE_Direct(directLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
        }
        #pragma unroll_loop_end
        #endif
        #if(NUM_SPOT_LIGHTS>0)&&defined(RE_Direct)
        SpotLight spotLight;
        vec4 spotColor;
        vec3 spotLightCoord;
        bool inSpotLightMap;
        #if defined(USE_SHADOWMAP)&&NUM_SPOT_LIGHT_SHADOWS>0
        SpotLightShadow spotLightShadow;
        #endif
        #pragma unroll_loop_start
        for(int i=0;i<NUM_SPOT_LIGHTS;i++){
            spotLight=spotLights[i];
            getSpotLightInfo(spotLight,geometryPosition,directLight);
            #if(UNROLLED_LOOP_INDEX<NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS)
            #define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
            #elif(UNROLLED_LOOP_INDEX<NUM_SPOT_LIGHT_SHADOWS)
            #define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
            #else
            #define SPOT_LIGHT_MAP_INDEX(UNROLLED_LOOP_INDEX-NUM_SPOT_LIGHT_SHADOWS+NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS)
            #endif
            #if(SPOT_LIGHT_MAP_INDEX<NUM_SPOT_LIGHT_MAPS)
            spotLightCoord=vSpotLightCoord[i].xyz/vSpotLightCoord[i].w;
            inSpotLightMap=all(lessThan(abs(spotLightCoord*2.-1.),vec3(1.)));
            spotColor=texture2D(spotLightMap[SPOT_LIGHT_MAP_INDEX],spotLightCoord.xy);
            directLight.color=inSpotLightMap?directLight.color*spotColor.rgb:directLight.color;
            #endif
            #undef SPOT_LIGHT_MAP_INDEX
            #if defined(USE_SHADOWMAP)&&(UNROLLED_LOOP_INDEX<NUM_SPOT_LIGHT_SHADOWS)
            spotLightShadow=spotLightShadows[i];
            directLight.color*=(directLight.visible&&receiveShadow)?getShadow(spotShadowMap[i],spotLightShadow.shadowMapSize,spotLightShadow.shadowBias,spotLightShadow.shadowRadius,vSpotLightCoord[i]):1.;
            #endif
            RE_Direct(directLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
        }
        #pragma unroll_loop_end
        #endif
        #if(NUM_DIR_LIGHTS>0)&&defined(RE_Direct)
        DirectionalLight directionalLight;
        #if defined(USE_SHADOWMAP)&&NUM_DIR_LIGHT_SHADOWS>0
        DirectionalLightShadow directionalLightShadow;
        #endif
        #pragma unroll_loop_start
        for(int i=0;i<NUM_DIR_LIGHTS;i++){
            directionalLight=directionalLights[i];
            getDirectionalLightInfo(directionalLight,directLight);
            #if defined(USE_SHADOWMAP)&&(UNROLLED_LOOP_INDEX<NUM_DIR_LIGHT_SHADOWS)
            directionalLightShadow=directionalLightShadows[i];
            directLight.color*=(directLight.visible&&receiveShadow)?getShadow(directionalShadowMap[i],directionalLightShadow.shadowMapSize,directionalLightShadow.shadowBias,directionalLightShadow.shadowRadius,vDirectionalShadowCoord[i]):1.;
            #endif
            RE_Direct_ToonPhysical(directLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight,metalnessFactor);
        }
        #pragma unroll_loop_end
        #endif
        #if(NUM_RECT_AREA_LIGHTS>0)&&defined(RE_Direct_RectArea)
        RectAreaLight rectAreaLight;
        #pragma unroll_loop_start
        for(int i=0;i<NUM_RECT_AREA_LIGHTS;i++){
            rectAreaLight=rectAreaLights[i];
            RE_Direct_RectArea(rectAreaLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
        }
        #pragma unroll_loop_end
        #endif
        #if defined(RE_IndirectDiffuse)
        vec3 iblIrradiance=vec3(0.);
        vec3 irradiance=getAmbientLightIrradiance(ambientLightColor);
        #if defined(USE_LIGHT_PROBES)
        irradiance+=getLightProbeIrradiance(lightProbe,geometryNormal);
        #endif
        #if(NUM_HEMI_LIGHTS>0)
        #pragma unroll_loop_start
        for(int i=0;i<NUM_HEMI_LIGHTS;i++){
            irradiance+=getHemisphereLightIrradiance(hemisphereLights[i],geometryNormal);
        }
        #pragma unroll_loop_end
        #endif
        #endif
        #if defined(RE_IndirectSpecular)
        vec3 radiance=vec3(0.);
        vec3 clearcoatRadiance=vec3(0.);
        #endif
        `,
        // 雾也要在 ACES 空间里混，不然远处的柱子会脏
        acesFog: /* glsl */ `
        #ifdef USE_FOG
        #ifdef FOG_EXP2
        float fogFactor=1.-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
        #else
        float fogFactor=smoothstep(fogNear,fogFar,vFogDepth);
        #endif
        vec3 linearFragCol=aces_fitted(gl_FragColor.rgb);
        gl_FragColor.rgb=mix(linearFragCol,fogColor,fogFactor);
        gl_FragColor.rgb=ACES_Inv(gl_FragColor.rgb);
        #endif
        `,
    }

    /* ==================== 引擎 ==================== */

    // gsap 的 back.out(1.70158)，路块浮起来时用
    function backOut(x) {
        const n = 1.70158
        const u = x - 1
        return u * u * ((n + 1) * u + n) + 1
    }

    // Blender 右手系 → three 坐标系，顺带缩放
    function toWorld(THREE, x, y, z) {
        return new THREE.Vector3(x, z, -y).multiplyScalar(SCALE)
    }

    function loadAssets(THREE, gltfLoader, texLoader) {
        const models = ['SM_BigCloud', 'SM_Light', 'SM_Road'].concat(COLUMN_MODELS)
        const textures = ['Tex_0062', 'Tex_0063', 'Tex_0067b', 'Tex_0071', 'Tex_0075']
        const out = {}
        return Promise.all([].concat(
            models.map(name => gltfLoader.loadAsync(ASSET_BASE + name + '.glb')
                .then(gltf => { out[name] = gltf })),
            textures.map(name => texLoader.loadAsync(ASSET_BASE + 'Textures/' + name + '.png')
                .then(tex => { out[name] = tex })),
        )).then(() => out)
    }

    function build(THREE, assets, renderer, scene, camera) {
        const parts = []          // 每帧要 update 的东西
        const disposables = []    // 销毁时要 dispose 的东西

        const timeUniform = { value: 0 }

        function track(...objs) {
            disposables.push(...objs)
        }

        /* ---- 渐变天空 ---- */
        {
            const geometry = new THREE.PlaneGeometry(2, 2)
            const material = new THREE.ShaderMaterial({
                vertexShader: SHADERS.finalVert,
                fragmentShader: SHADERS.gradientFrag,
                side: THREE.DoubleSide,
                depthWrite: false,
                uniforms: {
                    uColor1: { value: new THREE.Color('#001c54') },
                    uColor2: { value: new THREE.Color('#023fa1') },
                    uColor3: { value: new THREE.Color('#26a8ff') },
                    uStop1: { value: 0.2 },
                    uStop2: { value: 0.6 },
                },
            })
            const mesh = new THREE.Mesh(geometry, material)
            mesh.renderOrder = -1
            mesh.frustumCulled = false
            scene.add(mesh)
            track(geometry, material)
        }

        /* ---- 灯光 ---- */
        {
            scene.add(new THREE.AmbientLight(0x0f6eff, 6))

            const dirLight = new THREE.DirectionalLight(0xff6222, 35)
            dirLight.castShadow = true
            dirLight.shadow.mapSize.width = 1024
            dirLight.shadow.mapSize.height = 1024
            dirLight.shadow.camera.top = 400
            dirLight.shadow.camera.bottom = -100
            dirLight.shadow.camera.left = -100
            dirLight.shadow.camera.right = 400
            dirLight.shadow.camera.near = 1
            dirLight.shadow.camera.far = 50000
            dirLight.shadow.bias = -0.00005

            const target = new THREE.Object3D()
            dirLight.target = target
            scene.add(dirLight, target)

            // 太阳跟着相机走，否则跑出阴影相机的范围就没影子了
            const offset = new THREE.Vector3(10000, 0, 6000)
            offset.y = Math.hypot(offset.x, offset.z) / 1.35

            parts.push(() => {
                dirLight.position.copy(camera.position).add(offset)
                target.position.copy(camera.position)
            })
        }

        /* ---- 柱子与桥。同种模型合并成 InstancedMesh，越过相机就搬到队尾 ---- */
        {
            const groups = new Map()
            for (let i = 0; i < COLUMN.length; i += 6) {
                const name = COLUMN_MODELS[COLUMN[i]]
                if (!groups.has(name)) groups.set(name, [])
                groups.get(name).push({
                    position: toWorld(THREE, COLUMN[i + 1], COLUMN[i + 2], COLUMN[i + 3]),
                    // 原始数据只有绕 Z 的旋转，换到 three 里就是绕 Y
                    quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, COLUMN[i + 4], 0)),
                    scale: new THREE.Vector3().setScalar(COLUMN[i + 5] * SCALE),
                })
            }

            const units = []

            groups.forEach((instances, name) => {
                const meshes = []
                assets[name].scene.traverse(obj => {
                    if (!obj.isMesh) return
                    const material = obj.material
                    material.metalness = 0.3
                    material.onBeforeCompile = shader => {
                        shader.fragmentShader = shader.fragmentShader
                            .replace('#include <lights_physical_pars_fragment>',
                                '#include <lights_physical_pars_fragment>\n' + ACES + TOON_CHUNKS.columnDirect)
                            .replace('#include <lights_fragment_begin>', TOON_CHUNKS.lightsBegin)
                            .replace('#include <fog_fragment>', TOON_CHUNKS.acesFog)
                    }
                    const im = new THREE.InstancedMesh(obj.geometry, material, instances.length)
                    im.castShadow = true
                    im.frustumCulled = false
                    scene.add(im)
                    meshes.push(im)
                    track(obj.geometry, material)
                })
                units.push({ instances, meshes, dirty: true })
            })

            const mat4 = new THREE.Matrix4()
            parts.push(() => {
                units.forEach(unit => {
                    unit.instances.forEach(inst => {
                        if (inst.position.z > camera.position.z + 2000) {
                            inst.position.z -= LOOP_Z
                            unit.dirty = true
                        }
                    })
                    if (!unit.dirty) return
                    unit.dirty = false
                    unit.instances.forEach((inst, i) => {
                        mat4.compose(inst.position, inst.quaternion, inst.scale)
                        unit.meshes.forEach(mesh => mesh.setMatrixAt(i, mat4))
                    })
                    unit.meshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true })
                })
            })
        }

        /* ---- 天边的大云。整组贴着相机，所以怎么飞都追不上 ---- */
        {
            const mkMaterial = (frag, tex) => new THREE.ShaderMaterial({
                vertexShader: COMMON_VERT,
                fragmentShader: frag,
                transparent: true,
                depthWrite: false,
                uniforms: { uTexture: { value: tex } },
            })
            const front = mkMaterial(SHADERS.bigCloudFrag, assets['Tex_0063'])
            const back = mkMaterial(SHADERS.bigCloudBgFrag, assets['Tex_0067b'])
            track(front, back)

            const root = assets['SM_BigCloud'].scene
            root.traverse(obj => {
                if (!obj.isMesh) return
                obj.position.multiplyScalar(SCALE)
                obj.scale.multiplyScalar(SCALE)
                obj.renderOrder = -1
                obj.frustumCulled = false
                obj.material = obj.name === 'Plane011' ? front : back
                track(obj.geometry)
            })
            scene.add(root)
            parts.push(() => root.position.copy(camera.position))
        }

        /* ---- 云海 ---- */
        {
            const infos = []
            for (let i = 0; i < CLOUD.length; i += 3) {
                infos.push({ position: toWorld(THREE, CLOUD[i], CLOUD[i + 1], CLOUD[i + 2]) })
            }
            infos.sort((a, b) => a.position.z - b.position.z)

            const geometry = new THREE.PlaneGeometry(3000, 1500)
            const material = new THREE.ShaderMaterial({
                vertexShader: SHADERS.cloudVert,
                fragmentShader: SHADERS.cloudFrag,
                transparent: true,
                depthWrite: false,
                uniforms: {
                    iTime: timeUniform,
                    uTexture: { value: assets['Tex_0062'] },
                    uColor1: { value: new THREE.Color('#00a2f0') },
                    uColor2: { value: new THREE.Color('#f0f0f5') },
                },
            })
            track(geometry, material)

            const mesh = new THREE.InstancedMesh(geometry, material, infos.length)
            mesh.frustumCulled = false
            scene.add(mesh)

            parts.push(makeRecycler(THREE, infos, mesh, camera))
        }

        /* ---- 极光 ---- */
        {
            const infos = []
            const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.57, 0.85, 0))
            for (let i = 0; i < POLAR.length; i += 3) {
                infos.push({
                    position: toWorld(THREE, POLAR[i], POLAR[i + 1], POLAR[i + 2]),
                    quaternion,
                    scale: new THREE.Vector3().setScalar(SCALE),
                })
            }
            infos.sort((a, b) => a.position.z - b.position.z)

            const tex = assets['Tex_0071']
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping

            const geometry = assets['SM_Light'].scene.children[0].geometry
            const material = new THREE.ShaderMaterial({
                vertexShader: COMMON_VERT,
                fragmentShader: SHADERS.polarFrag,
                transparent: true,
                depthWrite: false,
                uniforms: { iTime: timeUniform, uTexture: { value: tex } },
            })
            track(geometry, material)

            const mesh = new THREE.InstancedMesh(geometry, material, infos.length)
            mesh.frustumCulled = false
            scene.add(mesh)

            parts.push(makeRecycler(THREE, infos, mesh, camera))
        }

        /* ---- 星尘 ---- */
        {
            const count = 4000
            const positions = new Float32Array(count * 3)
            const randoms = new Float32Array(count * 3)
            for (let i = 0; i < count; i++) {
                positions[i * 3] = THREE.MathUtils.randFloatSpread(2500)
                positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(2500)
                positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(1000)
                randoms[i * 3] = Math.random()
                randoms[i * 3 + 1] = Math.random()
                randoms[i * 3 + 2] = Math.random()
            }
            const geometry = new THREE.BufferGeometry()
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3))

            const material = new THREE.ShaderMaterial({
                vertexShader: SHADERS.starVert,
                fragmentShader: SHADERS.starFrag,
                transparent: true,
                depthWrite: false,
                uniforms: {
                    iTime: timeUniform,
                    uPointSize: { value: 10000 },
                    uPixelRatio: { value: renderer.getPixelRatio() },
                    uTexture: { value: assets['Tex_0075'] },
                },
            })
            track(geometry, material)

            const points = new THREE.Points(geometry, material)
            points.frustumCulled = false
            scene.add(points)

            parts.push(() => {
                points.position.set(camera.position.x, camera.position.y, camera.position.z - 200)
            })
        }

        /* ---- 路面雾 ---- */
        {
            const geometry = new THREE.PlaneGeometry(1000, 1000)
            const material = new THREE.ShaderMaterial({
                vertexShader: COMMON_VERT,
                fragmentShader: SHADERS.fogFrag,
                transparent: true,
                depthWrite: false,
                uniforms: { iTime: timeUniform },
            })
            track(geometry, material)

            const mesh = new THREE.Mesh(geometry, material)
            mesh.frustumCulled = false
            scene.add(mesh)

            parts.push(() => mesh.position.set(0, 0, camera.position.z - 400))
        }

        /* ---- 路。12 块拼一段，复制一段接在后面，越过相机就整块搬到前方浮起来 ---- */
        {
            const maxAniso = renderer.capabilities.getMaxAnisotropy()
            const root = assets['SM_Road'].scene

            root.traverse(obj => {
                if (!obj.isMesh) return
                obj.receiveShadow = true
                obj.frustumCulled = false
                const material = obj.material
                // 12 块路面只共用 2 份材质，所以这行会被乘上 6 次 —— 上游就是这么写的，
                // 路面偏暖的底色正是这么来的，别"修"成只乘一次。
                material.color.multiply(new THREE.Color('#fffcfe').add(new THREE.Color().setRGB(0.015, 0, 0)))
                material.normalMap.minFilter = THREE.LinearMipmapLinearFilter
                material.normalMap.anisotropy = maxAniso / 2
                material.roughnessMap.anisotropy = maxAniso / 2
                material.map.anisotropy = maxAniso / 2
                material.roughness = 5
                material.metalness = 0
                material.onBeforeCompile = shader => {
                    shader.fragmentShader = shader.fragmentShader
                        .replace('#include <lights_physical_pars_fragment>',
                            '#include <lights_physical_pars_fragment>\n' + ACES + TOON_CHUNKS.roadDirect)
                        .replace('#include <lights_fragment_begin>', TOON_CHUNKS.lightsBegin)
                }
                track(obj.geometry, material)
            })

            const offset = new THREE.Vector3(0, 34, 200)
            const tileCount = root.children.length
            root.children.forEach(obj => {
                obj.position.multiplyScalar(SCALE)
                obj.scale.multiplyScalar(SCALE)
                obj.position.sub(offset)
            })
            for (let i = 0; i < tileCount; i++) {
                const cloned = root.children[i].clone()
                cloned.position.z -= 212.4027
                root.add(cloned)
            }
            const zLength = 212.4027 * 2

            const tiles = root.children.map(obj => ({ obj, y: obj.position.y, t: 1 }))
            scene.add(root)

            parts.push(dt => {
                tiles.forEach(tile => {
                    if (tile.obj.position.z > camera.position.z) {
                        tile.obj.position.z -= zLength
                        tile.t = 0
                    }
                    if (tile.t < 1) {
                        tile.t = Math.min(1, tile.t + dt / 2)
                        tile.obj.position.y = tile.y - 70 * (1 - backOut(tile.t))
                    }
                })
            })
        }

        return {
            update(dt, elapsed) {
                timeUniform.value = elapsed
                parts.forEach(fn => fn(dt))
            },
            dispose() {
                disposables.forEach(d => {
                    if (!d) return
                    // 模型自带的贴图挂在材质属性上，material.dispose() 不管它们
                    if (d.isMaterial) Object.values(d).forEach(v => v && v.isTexture && v.dispose())
                    d.dispose()
                })
            },
        }
    }

    // 云和极光的无限延伸：整个列表按 z 排好序，队尾那个一旦越过相机就搬到队首、
    // 减掉一整圈的长度。障眼法，但一直有东西在前面。
    function makeRecycler(THREE, infos, mesh, camera) {
        const mat4 = new THREE.Matrix4()
        const identity = new THREE.Quaternion()
        const unit = new THREE.Vector3(1, 1, 1)

        function flush() {
            infos.forEach((info, i) => {
                mat4.compose(info.position, info.quaternion || identity, info.scale || unit)
                mesh.setMatrixAt(i, mat4)
            })
            mesh.instanceMatrix.needsUpdate = true
        }
        flush()

        return () => {
            if (infos[infos.length - 1].position.z > camera.position.z) {
                const last = infos.pop()
                last.position.z -= LOOP_Z
                infos.unshift(last)
                flush()
            }
        }
    }

    /* ==================== 生命周期 ==================== */

    // 同一时刻只有一个实例。资产要拉好几秒，这期间用户完全可能已经登录进去了，
    // 所以每个 await 之后都要看一眼自己是不是已经被作废。
    let active = null

    async function start() {
        const self = { cancelled: false, stop: null }
        active = self

        const [THREE, gltfMod, dracoMod] = await Promise.all([
            import(THREE_URL), import(GLTF_URL), import(DRACO_URL),
        ])
        if (self.cancelled) return

        THREE.ColorManagement.enabled = false

        const draco = new dracoMod.DRACOLoader().setDecoderPath(DRACO_DECODER)
        const gltfLoader = new gltfMod.GLTFLoader().setDRACOLoader(draco)
        const assets = await loadAssets(THREE, gltfLoader, new THREE.TextureLoader())
        draco.dispose()
        if (self.cancelled) return

        const canvas = document.createElement('canvas')
        canvas.id = 'genshin-login-canvas'
        canvas.style.cssText =
            'position:fixed;inset:0;width:100%;height:100%;display:block;' +
            'pointer-events:none;opacity:0;transition:opacity 1.2s ease;z-index:' + CANVAS_Z

        const style = document.createElement('style')
        // 让出背景，否则 Element Plus 给 body 铺的底色会把天空盖死
        style.textContent = 'html.genshin-login-3d,body.genshin-login-3d{background:transparent !important}'

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
        renderer.setSize(window.innerWidth, window.innerHeight, false)
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace
        renderer.toneMapping = THREE.NoToneMapping   // 交给最后那道全屏 pass
        renderer.useLegacyLights = true              // 上游的光强都是按旧口径调的
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap

        const scene = new THREE.Scene()
        scene.fog = new THREE.Fog(0x389af2, 5000, 10000)

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 50, 100000)
        camera.position.set(0, 0, 0)
        camera.rotation.x = THREE.MathUtils.degToRad(5.5)

        // 场景先画进 HDR 缓冲，半透明图层都在 ACES 空间里混完，最后一道 pass 再
        // 正变换到屏幕。这一步不能省：材质里的 ACES_Inv 没有它就没人抵消。
        // ponytail: 上游还有 bloom（阈值 2、强度 0.6）和景深，前者只是给亮部加一
        // 圈晕、后者只服务于开门动画，都跳过了。想要 bloom 再在这里插一道降采样
        // 模糊，别为它把整个 postprocessing 拉进来。
        const rt = new THREE.WebGLRenderTarget(1, 1, {
            type: THREE.HalfFloatType,
            samples: 4,
        })
        const finalScene = new THREE.Scene()
        const finalCamera = new THREE.Camera()
        const finalGeo = new THREE.PlaneGeometry(2, 2)
        const finalMat = new THREE.ShaderMaterial({
            vertexShader: SHADERS.finalVert,
            fragmentShader: SHADERS.finalFrag,
            depthTest: false,
            depthWrite: false,
            uniforms: { tDiffuse: { value: rt.texture }, uExposure: { value: 1 } },
        })
        const finalMesh = new THREE.Mesh(finalGeo, finalMat)
        finalMesh.frustumCulled = false
        finalScene.add(finalMesh)

        const world = build(THREE, assets, renderer, scene, camera)
        const clock = new THREE.Clock()

        function resize() {
            const w = window.innerWidth
            const h = window.innerHeight
            const pr = renderer.getPixelRatio()
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h, false)
            rt.setSize(Math.floor(w * pr), Math.floor(h * pr))
        }
        resize()
        window.addEventListener('resize', resize)

        let raf = 0
        function frame() {
            raf = requestAnimationFrame(frame)
            // 标签页在后台就别烧 GPU 了
            if (document.hidden) { clock.getDelta(); return }

            const dt = Math.min(clock.getDelta(), 0.1)
            camera.position.z -= CAMERA_SPEED * dt
            world.update(dt, clock.elapsedTime)

            renderer.setRenderTarget(rt)
            renderer.render(scene, camera)
            renderer.setRenderTarget(null)
            renderer.render(finalScene, finalCamera)
        }

        document.head.appendChild(style)
        document.documentElement.classList.add('genshin-login-3d')
        document.body.classList.add('genshin-login-3d')
        document.body.appendChild(canvas)
        frame()
        requestAnimationFrame(() => { canvas.style.opacity = '1' })

        self.stop = () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('resize', resize)
            canvas.remove()
            style.remove()
            document.documentElement.classList.remove('genshin-login-3d')
            document.body.classList.remove('genshin-login-3d')
            world.dispose()
            finalGeo.dispose()
            finalMat.dispose()
            rt.dispose()
            Object.values(assets).forEach(a => a.isTexture && a.dispose())
            renderer.dispose()
            renderer.forceContextLoss()   // 显式还回 WebGL 上下文，列表页不留任何三维开销
        }
    }

    function stop() {
        if (!active) return
        const self = active
        active = null
        self.cancelled = true
        if (self.stop) self.stop()
    }

    /**
     * 光在 DOM 里不算数，得真的渲染出来。
     *
     * ani-rss 本体是 v-if，登录完元素直接没了，两种判断等价；但预览页是把登录页
     * display:none 留在 DOM 里的，只看「在不在」会导致列表页背后也糊上一层天空。
     * getClientRects() 对 display:none 及其子孙返回空，正好用来区分。
     * el 为 null 时短路，列表页不会白白触发一次强制布局。
     */
    function onLoginPage() {
        const el = document.querySelector(LOGIN_SEL)
        return !!el && el.getClientRects().length > 0
    }

    /**
     * 「忘记密码」那个链接。
     *
     * 登录表单里本来没有这个节点，主题 CSS 是拿 .action::after 画出来的 —— 好看，
     * 但伪元素点不了，CSS 也造不出链接。所以这里补一个真的 <a>；CSS 见到它就把那个
     * 伪元素收起来（.action:has(.gs-forgot)::after）。
     *
     * 本体是 Vue，重渲染会把它冲掉，所以每次 sync 都补一次，已经在就直接返回。
     */
    function ensureForgotLink() {
        if (!FORGOT_URL) return
        const row = document.querySelector(LOGIN_SEL + ' .action')
        if (!row || row.querySelector('.gs-forgot')) return
        const a = document.createElement('a')
        a.className = 'gs-forgot'
        a.href = FORGOT_URL
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.textContent = '忘记密码'
        row.appendChild(a)   // 排在哪由 CSS 的 order 决定，不看 DOM 顺序
    }

    function sync() {
        const onLogin = onLoginPage()
        if (onLogin) ensureForgotLink()
        if (onLogin && can3d && !active) {
            start().catch(err => {
                console.warn('[原神启动] 背景没起来：', err)
                stop()
            })
        } else if (!onLogin && active) {
            stop()
        }
    }

    /* ==================== 入口 ==================== */

    /* 不启动就说一声。这几条以前是静默 return，表现是「等半天没动画、控制台干干净净」，
       没法查 —— 尤其「减弱动态效果」这条，Windows 的动画效果一关就会命中。 */
    function bail(why) {
        console.info('[原神启动] 三维背景未启动：' + why)
    }

    /* 三维背景起不起得来，和「忘记密码」那个链接无关：下面任何一条不通过，脚本也
       不退出，链接照补，只是背后没有天空。 */
    const can3d = (function () {
        if (!ASSET_BASE) {
            bail('ASSET_BASE 是空的，等于主动关掉了')
            return false
        }

        if (matchMedia('(prefers-reduced-motion: reduce)').matches && !window.GENSHIN_LOGIN_FORCE) {
            bail(
                '系统开了「减弱动态效果」（Windows：设置 → 辅助功能 → 视觉效果 → 动画效果；' +
                'macOS：辅助功能 → 显示 → 减弱动态效果）。' +
                '确定要无视它，就在本脚本之前设 window.GENSHIN_LOGIN_FORCE = true')
            return false
        }

        // WebGL2 是硬要求：卡通光照那几段是 ESSL3，跑不了 WebGL1
        if (!document.createElement('canvas').getContext('webgl2')) {
            bail('这个浏览器或显卡驱动没有 WebGL2')
            return false
        }

        return true
    })()

    /* 列表页每次渲染都会触发一堆 mutation，攒到下一帧再查一次就够了。
       attributes 也得看：预览页切登录页改的是 style.display，不是增删节点。 */
    let pending = false
    new MutationObserver(() => {
        if (pending) return
        pending = true
        requestAnimationFrame(() => { pending = false; sync() })
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
    })

    sync()
})()
