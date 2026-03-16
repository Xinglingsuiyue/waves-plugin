![waves-plugin](https://socialify.git.ci/erzaozi/waves-plugin/image?description=1&font=Raleway&forks=1&issues=1&language=1&name=1&owner=1&pattern=Circuit%20Board&pulls=1&stargazers=1&theme=Auto)

<img decoding="async" align=right src="resources/readme/girl.png" width="35%">

# WAVES-PLUGIN

- 一个适用于 [Yunzai 系列机器人框架](https://github.com/yhArcadia/Yunzai-Bot-plugins-index) 的鸣潮游戏数据查询插件（原版目前是暂停维护状态）原版请前往https://github.com/erzaozi/waves-plugin.git 查看

先把更新地址替换一下

## 切换步骤

1. **进入插件目录**
   ```bash
   cd plugins/waves-plugin/
   ```

2. **查看当前远程仓库信息**
   ```bash
   git remote -v
   ```
   正常情况下您会看到类似这样的输出：
   ```
   origin  https://github.com/erzaozi/waves-plugin.git (fetch)
   origin  https://github.com/erzaozi/waves-plugin.git (push)
   ```

3. **修改远程仓库地址**
   ```bash
   git remote set-url origin https://github.com/Xinglingsuiyue/waves-plugin.git
   ```

4. **验证修改是否成功**
   ```bash
   git remote -v
   ```
   现在应该显示新的仓库地址：
   ```
   origin  https://github.com/Xinglingsuiyue/waves-plugin.git (fetch)
   origin  https://github.com/Xinglingsuiyue/waves-plugin.git (push)
   ```

5. **从新仓库拉取更新**
   ```bash
   git pull origin main
   ```

### 后续更新

之后您可以使用常规的更新命令来获取最新代码：
```bash
～更新
```

### 注意事项
- 如果遇到冲突，您可能需要手动解决
- 切换后可能需要重新安装依赖：
  ```bash
  pnpm install
  ```
- 建议在操作前备份您的插件配置

### 问题排查

如果遇到问题，可以尝试：
### 摆烂重装

- 支持手机验证码登录或 Token 登录，支持查询玩家、日常、数据坞、抽卡等游戏数据

- **使用中遇到问题请加 QQ 群咨询：[707331865](https://qm.qq.com/q/TXTIS9KhO2)**

> [!TIP]
> 最近看见群友都在玩潮啊，入坑了几天还算有意思（剧情全跳了）。群里有人建议我搓一个，反正闲的无聊，那就动手搓一个罢。哦对了，你怎么知道我是安可和维里奈双萝莉开局？

## 安装插件

#### 1. 克隆仓库

```
git clone https://github.com/Xinglingsuiyue/waves-plugin.git ./plugins/waves-plugin
```

> [!NOTE]
> 如果你的网络环境较差，无法连接到 Github，可以使用 [GitHub Proxy](https://ghproxy.link/) 提供的文件代理加速下载服务
>

#### 2. 安装依赖

```
pnpm install --filter=waves-plugin
```

## 插件配置

#### 支持的 OCR 服务

| 服务商 | 官网地址 | 特点 |
| ------ | ---------- | ------ |
| **OCRSpace** | [官方网站](https://ocr.space) | 免费额度丰富 |

#### 配置步骤

1. **申请 API Key**: 前往对应官网注册并获取密钥（支持多个Key）
2. **填写配置**: 非常不建议手动修改配置文件，本插件已兼容 [Guoba-plugin](https://github.com/guoba-yunzai/guoba-plugin) ，请使用锅巴插件对配置项进行修改


> [!WARNING]
> 非常不建议手动修改配置文件，本插件已兼容 [Guoba-plugin](https://github.com/guoba-yunzai/guoba-plugin) ，请使用锅巴插件对配置项进行修改
> 
> > <details><summary>部署本地化登录并打开 网页登录 功能</summary>
> > <br>
> > 
> > 在开始之前，请确保您已准备好以下内容：
> > - 机器人服务器具备公网IP或可用的公网端口
> > - 没有公网IP或者不想暴露公网IP的用户请看下方 `使用 Cloudflare Tunnel 实现本地化登录服务` 教程
> > 
> > #### 步骤详解
> > 
> > 0. **打开在线登录服务**
> >    - 在锅巴的本插件配置面板中，找到 `允许网页登录` 配置项，将其开关打开
> >    - 使用本地浏览器访问 `http://127.0.0.1:25088`，如果跳转到项目 Github 首页，说明服务已开启
> >
> > 1. **放行端口**
> >    - 如果你是云服务器，请登录对应的云服务器控制台，找到并打开 `安全组`，放行 `25088` 端口
> >    - 如果你是本地服务器，请确保你的防火墙已允许端口 `25088` 的访问
> > 
> > 2. **保存和测试**
> >    - 通过访问 `http://服务器公网IP:25088` 来测试您的本地化登录服务是否能够正常工作，如果跳转到项目 Github 首页，说明配置正确
> >
> > 3. **配置插件**
> >    - 在锅巴的本插件配置面板中，找到 `登录服务公开地址` 配置项，将您刚刚配置的隧道地址填入，例如 `http://39.156.66.10:25088`
> >    - 向机器人发送命令 `~登录`，尝试访问机器人给出的登录地址，如果能访问登录页面说明配置正确
> > 
> > #### 注意事项
> > - 没有图形界面的 Linux 用户可以使用 `curl` 命令来测试登录服务是否能够正常工作，例如：`curl http://127.0.0.1:25088`
> > - 如果按照上述步骤，仍然无法访问登录页面，请尝试以下操作：
> >   1. 使用端口扫描工具检查端口是否开启
> >   2. 若机器人是容器部署需要自行配置端口映射
> >   3. 尝试使用不同网络访问登录服务或让群友进行访问测试
> > 
> > </details>
> > <details><summary>使用 Cloudflare Tunnel 实现本地化登录服务</summary>
> > <br>
> > 
> > 在开始之前，请确保您已准备好以下内容：
> > - 一个注册好的 Cloudflare 账户
> > - 一个已经交给 Cloudflare 托管的域名 [注册免费域名](https://register.us.kg/auth/login)
> > 
> > #### 步骤详解
> > 
> > 0. **打开在线登录服务**
> >    - 在锅巴的本插件配置面板中，找到 `允许网页登录` 配置项，将其开关打开
> >    - 使用本地浏览器访问 `http://127.0.0.1:25088`，如果跳转到项目 Github 首页，说明服务已开启
> >
> > 1. **访问 Cloudflare Zero Trust 工作台**
> >    - 打开浏览器，在地址栏打开 [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) 并登录您的 Cloudflare 账户
> > 
> > 2. **创建隧道**
> >    - 在工作台面板上，依次点击左侧导航栏中的 `Networks` 选项
> >    - 在下拉菜单中选择 `Tunnels`
> >    - 点击页面左上角的 `Create a tunnel` 按钮
> >    - 在 `Select your tunnel type` 中选择 `Cloudflared`，点击 `Next`
> >    - 在接下来的网页中，输入一个易于辨识的隧道名称（如 `kuro-login-tunnel`），然后点击 `Save tunnel`
> > 
> > 3. **选择环境**
> >    - 在 `Choose your environment` 部分，选择与您运行的机器人相对应的环境（例如，Linux、Windows、macOS等）
> >    - 根据所选环境，查看底部的 `Install and run a connector` 部分，按照指示进行必要的安装和配置
> > 
> > 4. **配置隧道设置**
> >    - 在页面的最后部分进行隧道设置，以便配置您的登录网址：
> >      - 在 `Subdomain` 字段中输入您希望使用的子域名，例如 `waves`
> >      - 在 `Domain` 下拉菜单中选择您托管的域名，例如 `example.com`
> >      - 在 `Path` 字段中保持为空，除非您有特定的路径需要设置
> >      - 在 `Type` 选项中选择 `HTTP`
> >      - 在 `URL` 字段中输入您本地服务的地址（例如 `localhost:25088`）。请根据您的实际服务端口进行调整
> > 
> > 5. **保存和测试**
> >    - 确认所有配置无误后，点击 `Save tunnel` 完成设置
> >    - 返回到隧道管理页面，查看新创建的隧道状态，确保其为活跃在线状态
> >    - 通过访问 `https://waves.example.com` 来测试您的本地化登录服务是否能够正常工作，如果跳转到项目 Github 首页，说明配置正确
> >
> > 6. **配置插件**
> >    - 在锅巴的本插件配置面板中，找到 `登录服务公开地址` 配置项，将您刚刚配置的隧道地址填入，例如 `https://waves.example.com`
> >    - 向机器人发送命令 `~登录`，尝试访问机器人给出的登录地址，如果能访问登录页面说明配置正确
> > 
> > #### 注意事项
> > - 对于不同环境，Cloudflare 连接器的安装细节可能略有不同，请参考 Cloudflare 的官方文档进行具体操作
> > - 没有图形界面的 Linux 用户可以使用 `curl` 命令来测试登录服务是否能够正常工作，例如：`curl http://127.0.0.1:25088`
> > - 如果按照上述步骤，仍然无法访问登录页面，请尝试以下操作：
> >   1. 检查隧道状态确保其为活跃在线状态
> >   2. 若机器人是容器部署需要自行配置端口映射
> >   3. 尝试使用不同网络访问登录服务或让群友进行访问测试
> > 
> > </details>

## 功能列表

请使用 `~帮助` 获取完整帮助

- [x] 登录账号
- [x] 自动签到
- [x] 用户信息查询
- [x] 日常数据查询
- [x] 波片恢满提醒
- [x] 数据坞 / 声骸查询
- [x] 探索度查询
- [x] 挑战数据查询
- [x] 逆境深塔数据查询
- [x] 练度统计
- [x] 抽卡记录查询分析
- [x] 抽卡记录导入导出
- [x] 游戏内所有物品图鉴
- [x] 官方公告推送
- [x] 角色攻略
- [x] 抽卡模拟器
- [x] 随机表情包
- [x] 角色卡片查询
- [x] 计算声骸得分
- [x] 活动日历查询
- [x] 库街区签到
- [x] 用户统计
- [x] 海墟
- [x] 百连
- [x] 便捷上传攻略
- [x] 模拟声骇梭哈
- [x] 星声功能
- [x] 角色持有率
- [x] 角色评级排名
- [x] Cosplay
- [x] 角色评分
- [ ] 伤害计算
- [ ] 卡池倒计时

## 功能列表

<details><summary>点击展开</summary>

| 命令      | 功能                       | 示例                                                                                                |
| --------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| ~登录     | 登录账户 Token             | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Bind.png)      |
| ~卡片     | 获取用户详细信息           | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/User.png)      |
| ~签到     | 库街区签到                 | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/SignIn.png)    |
| ~体力     | 获取用户日常数据卡片       | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Sanity.png)    |
| ~数据坞   | 获取用户数据坞以及声骸信息 | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Calabash.png)  |
| ~探索度   | 获取用户探索度数据卡片     | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Explore.png)   |
| ~全息战略 | 获取用户挑战数据卡片       | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Challenge.png) |
| ~面板     | 获取用户角色面板           | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Panel.png)     |
| ~抽卡记录 | 获取用户抽卡数据卡片       | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Gacha.png)     |
| ~日历     | 获取游戏活动时间           | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Calendar.png)  |
| ~图鉴     | 获取游戏内所有物品图鉴     | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Guide.png)     |
| ~攻略     | 获取角色攻略               | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Strategy.png)  |
| ~十连     | 抽卡模拟器                 | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Simulator.png) |
| ~公告     | 获取官方公告与资讯         | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/News.png)      |
| ~帮助     | 获取插件帮助               | ![renderings](https://cdn.jsdelivr.net/gh/erzaozi/waves-plugin@main/resources/readme/Help.png)      |

</details>

## 支持与贡献

如果你喜欢这个项目，请不妨点个 Star🌟，这是对开发者最大的动力， 当然，你可以对我 [爱发电](https://afdian.net/a/sumoqi) 赞助，呜咪~❤️

有意见或者建议也欢迎提交 [Issues](https://github.com/Xinglingsuiyue/waves-plugin/issues) 和 [Pull requests](https://github.com/Xinglingsuiyue/waves-plugin/pulls)。

## 资源

1. 图鉴：[库街区 Wiki](https://wiki.kurobbs.com/mc/home)
2. 角色攻略：[小沐XMu](https://www.kurobbs.com/person-center?id=10450567) & [moealkyne](https://www.kurobbs.com/person-center?id=10422445) & [金铃子](https://www.kurobbs.com/person-center?id=10584798) & [丸子](https://space.bilibili.com/75)
3. 声骸评分：[燊林大火](https://github.com/SLDHshenlindahuo)
4. 帮助背景图：[loong](https://x.com/loong_blo/status/1848708696521773257)
5. 角色持有率数据：[WutheringWavesUID](https://github.com/tyql688/WutheringWavesUID) & [XutheringWavesUID](https://github.com/Loping151/XutheringWavesUID)

## 许可证

本项目使用 [GNU AGPLv3](https://choosealicense.com/licenses/agpl-3.0/) 作为开源许可证。

> [!CAUTION]
> **禁止** 对本项目的 HTML 模板及其他渲染 UI 文件进行 **复制**、**修改** 或 **再分发**。这包括但不限于公开托管、分享或将这些文件包含在其他项目中
