# HTML5 WebGL FPS Demo

纯 HTML5 + 原生 JavaScript + WebGL2 的 3D 第一人称射击演示（无第三方库）。

## 运行

浏览器对 `Pointer Lock` + `WebGL` 通常要求通过 HTTP 打开（不要直接双击 `index.html`）。

在项目目录运行：

```bash
python3 -m http.server 5173
```

然后打开：

```
http://localhost:5173/
```

## 操作

- 点击页面进入游戏（Pointer Lock）
- W/A/S/D：移动
- Space：跳跃
- Shift：冲刺
- 鼠标左键：射击
- R：换弹
- 1 / 2：切换武器
- B：切换开火模式（AUTO/SEMI）
- Esc：退出指针锁定（暂停）

## 说明

这不是《CS:GO》的完整复刻（完整地图/枪械/网络/动画/音效/经济系统等规模巨大且涉及版权）。
当前版本提供一个可玩的单机 FPS 基础骨架，后续可以继续扩展：更多武器、AI、关卡、贴图、音效、多人联机等。
