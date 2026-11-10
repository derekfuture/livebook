# 地理测试站的预览图（给老师看的一览长图）

1. `node tools/geo/preview/capture.mjs`：在测试站（geo-preview.livebook-1ej.pages.dev，没有课本书页）上给每张地理活页截图，存到 /tmp/pv_thumbs/（已有的跳过；`IDS=a,b` 只重截这几张）。
2. `python3 tools/geo/preview/make.py`：生成封面和按册的一览页（HTML，在 /tmp/pv_poster/）。
3. `node tools/geo/preview/shot.mjs`：截成长图（/tmp/pv_poster/*.png）。

截图时裁掉左边的纸卡和右边的按钮（make.py 里卡片的宽高比按裁过的图）。
