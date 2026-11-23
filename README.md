# 《书法艺术的魅力》VPS 更新 · 给 Hermes

目标：更新现有 class.thezrz.com，不新建站点。继续使用现有域名、Nginx 配置和课堂数据库。

1. 解压 ZIP。通过 systemctl cat zhangfa-classroom 和 readlink -f /opt/zhangfa-classroom/current 核对线上实际服务名、程序路径和数据库路径。按实际配置操作。
2. 把包内 classroom-server.mjs、dist、drizzle、smoke-test.mjs 放入新发布目录（例如 /opt/zhangfa-classroom/releases/lesson-recap-shapes-20261123），保留旧目录。请勿只复制独立的 HTML、JS：Node 服务实际读取 dist/server/index.js 中的打包资源。
3. 在无课时段停止服务，备份现有 SQLite 数据库和当前发布链接。将 current 原子切换到新目录，再启动服务，检查 systemctl 状态及日志。沿用现有配置文件；若旧版本尚未执行 0012，程序启动会自动补跑。
4. 用两个设备验收：教师开课，学生用原站扫码入班。辨书体在教师端展开“辨书体小结”，显示“字形各异，美感不同。”；《兰亭序》先从四幅选定武本，下一页直接并排看前三幅，接着聚焦“永和九年”，点“去除干扰”。口头交流后，在教师端展开“观察小结”，显示“字形相近，美感亦异。”。学生端全程提示看大屏幕，教师进入用笔之美后，学生不重新扫码也能跟上。
5. 若仍看到“两两比较”，检查线上 /course/lanting/index.html 的资源版本是否是 lesson-recap-shapes-20261123，以及服务是否真的从新目录启动。若启动失败，恢复旧发布链接并重启，保留数据库与日志，勿删库。
