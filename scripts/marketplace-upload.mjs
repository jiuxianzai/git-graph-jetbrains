// 通过 Visual Studio Marketplace 的管理页面「New extension → Visual Studio Code」上传 vsix。
// 由 release.sh 通过 `ego-browser nodejs < scripts/marketplace-upload.mjs` 调用。
//
// 输入（release.sh 写入的 JSON，ego-browser 不继承 shell 环境变量，所以走文件）：
//   /tmp/vsce-upload-config.json
//   { "vsix": "/abs/path/x.vsix", "publisher": "jiuxianzai", "publish": false, "spaceName": "marketplace upload" }
//
// publish=false  → 演练：停在「Upload」确认页，不点上传
// publish=true   → 点 Upload 真正发布，并等待结果

const fs = await import("node:fs/promises");

const CFG_PATH = "/tmp/vsce-upload-config.json";
const cfg = JSON.parse(await fs.readFile(CFG_PATH, "utf8"));

const say = (obj) => console.log(JSON.stringify(obj, null, 1));

const task = await taskSpace(cfg.spaceName || "marketplace upload");
const page = task.page("p1");
const manageUrl = `https://marketplace.visualstudio.com/manage/publishers/${cfg.publisher}`;

await page.goto(manageUrl, { timeout: 60000 });
await page.waitForTimeout(4000);

const url = await page.url();
if (/login\.microsoftonline\.com|\/_signin/.test(url)) {
  await task.handOff();
  say({ ok: false, reason: "NOT_LOGGED_IN", url, note: "请在浏览器窗口登录后再重跑" });
} else {
  await page.waitForSelector('css:button[name="New extension"]', { timeout: 25000 });
  await page.click('css:button[name="New extension"]', { label: "open new extension menu" });
  await page.waitForTimeout(1200);
  await page.click('css:button[name="Visual Studio Code"]', { label: "choose VS Code target" });
  await page.waitForTimeout(2500);
  await page.setInputFiles("#file-upload", cfg.vsix);
  await page.waitForTimeout(7000);

  const readDialog = async () =>
    page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return null;
      const upload = [...dlg.querySelectorAll("button")].find(
        (b) => (b.innerText || "").trim() === "Upload",
      );
      return {
        text: (dlg.innerText || "").slice(0, 600),
        hasUpload: !!upload,
        uploadDisabled: upload ? upload.disabled : null,
      };
    });

  const before = await readDialog();
  say({ ok: true, stage: "attached", dialog: before });

  if (!before || !before.hasUpload) {
    say({ ok: false, reason: "DIALOG_NOT_READY" });
  } else if (before.uploadDisabled) {
    say({ ok: false, reason: "UPLOAD_BUTTON_DISABLED" });
  } else if (!cfg.publish) {
    // 演练：不提交，把窗口留给用户看
    say({
      ok: true,
      stage: "rehearsal-complete",
      note: "已停在 Upload 确认页，未上传。可以直接在窗口里点 Upload 手动完成。",
    });
  } else {
    try {
      await page.click('role:button[name="Upload"]', { label: "upload vsix" });
    } catch {
      await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        const btn = [...dlg.querySelectorAll("button")].find(
          (b) => (b.innerText || "").trim() === "Upload",
        );
        btn.click();
      });
    }

    // 结果：成功则对话框关闭并跳转扩展详情页；失败会出现错误提示
    let last = null;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(3000);
      last = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        const body = (document.body.innerText || "").slice(0, 4000);
        const errLine = body
          .split("\n")
          .map((s) => s.trim())
          .find((s) =>
            /already exists|error|failed|invalid|无法|错误|失败/i.test(s),
          );
        return { hasDialog: !!dlg, url: location.href, errLine: errLine || null };
      });
      if (last.errLine) break;
      if (!last.hasDialog) break;
    }
    say({ ok: !last?.errLine, stage: "publish-attempt", result: last });
  }
}
