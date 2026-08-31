/* --------------------------------------------------------------
Gold Widget - 黄金价格小组件 (Scriptable)
数据源: 新浪财经 (免费, 无需key, 不需要TextDecoder)
  - hf_XAU   : 伦敦金 现货黄金 (美元/盎司)
  - fx_susdcny : 在岸人民币 汇率 (USD/CNY)
换算: 美元/盎司 ÷ 31.1034768 克 × 汇率 = 人民币/克
兼容: 使用最基础 Font API (systemFont/footnote)，适配精简版 Scriptable
--------------------------------------------------------------- */

const gramsPerOunce = 31.1034768;

// ============ 配置 ============
const REFRESH_MINUTES = 5;   // 刷新间隔(分钟)
// =============================

// --- 抓取新浪行情 (用 loadString, 股名/中文乱码无妨, 只取数字) ---
async function fetchSina(code) {
    const req = new Request("https://hq.sinajs.cn/list=" + code);
    req.headers = { "Referer": "https://finance.sina.com.cn/" };
    let text = await req.loadString(); // 返回字符串
    // 提取引用里的逗号分隔数据
    const m = text.match(/"([^"]*)"/);
    if (!m) return null;
    return m[1].split(",");
}

// --- 主函数 ---
async function createWidget() {
    const list = new ListWidget();
    // 深色背景
    let g = new LinearGradient();
    g.colors = [new Color("#191a19"), new Color("#0d0d0d")];
    g.locations = [0.1, 1];
    list.backgroundGradient = g;
    list.addSpacer(3);

    try {
        // 抓取金价和汇率
        const gold = await fetchSina("hf_XAU");
        const fx   = await fetchSina("fx_susdcny");
        if (!gold || !fx || gold.length < 2) throw new Error("金价数据获取失败");

        const xauUSD   = parseFloat(gold[0]);   // 美元/盎司 最新
        const prevUSD  = parseFloat(gold[1]);   // 昨收(元/盎司)
        const usdcny   = parseFloat(fx[1]);     // 汇率 USD->CNY

        if (isNaN(xauUSD) || isNaN(prevUSD) || isNaN(usdcny) || prevUSD <= 0)
            throw new Error("数据字段异常");

        const coef = usdcny / gramsPerOunce;   // 美元/盎司 -> 元/克
        const pricePerGram = xauUSD * coef;
        const prevPerGram  = prevUSD * coef;

        // 涨跌
        const change = ((pricePerGram / prevPerGram) - 1) * 100;
        let color;
        let arrow;
        if (change > 0) { color = new Color("#ff3b30"); arrow = "↑"; } // 红涨
        else if (change < 0) { color = new Color("#00c060"); arrow = "↓"; } // 绿跌
        else { color = new Color("#ff9500"); arrow = "→"; }

        // 标题行
        let titleStack = list.addStack();
        titleStack.layoutHorizontally();
        const header = titleStack.addText("黄金 XAU/CNH");
        header.font = Font.systemFont(15);
        header.textColor = Color.white();
        titleStack.addSpacer(null);
        const trend = titleStack.addText(`${arrow} ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`);
        trend.font = Font.systemFont(13);
        trend.textColor = color;

        // 单位行
        const sub = list.addText("人民币 / 克");
        sub.font = Font.footnote();
        sub.textColor = Color.gray();
        list.addSpacer(10);

        // 主价格
        const label = list.addText(pricePerGram.toFixed(2));
        label.font = Font.systemFont(42);
        label.rightAlignText();
        label.minimumScaleFactor = 0.8;
        label.textColor = color;

        list.addSpacer(6);

        // 明细行
        const detail = list.addText(`美元/盎司 $${xauUSD.toFixed(2)}  汇率 ${usdcny.toFixed(4)}`);
        detail.font = Font.footnote();
        detail.textColor = Color.gray();
        list.addSpacer(4);

        // 更新时刻（北京时间）
        const t = new Date();
        const p = n => String(n).padStart(2, "0");
        const timeText = list.addText(`更新 ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`);
        timeText.font = Font.footnote();
        timeText.textColor = Color.gray();

    } catch (e) {
        list.addText("⚠️ " + (e.message || "获取失败"));
        console.error("Error:", e);
    }

    return list;
}

// --- 执行 ---
const widget = await createWidget();

let now = new Date();
let then = new Date(now.getTime() + REFRESH_MINUTES * 60 * 1000);
let timer = widget.addDate(then);
timer.applyRelativeStyle();

if (config.widgetFamily) {
    Script.setWidget(widget);
} else {
    await widget.presentSmall();
}
Script.complete();
