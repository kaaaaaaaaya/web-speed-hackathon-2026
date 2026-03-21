import type * as playwright from "playwright";
import type * as puppeteer from "puppeteer";

import { consola } from "../consola";
import { goTo } from "../utils/go_to";
import { startFlow } from "../utils/start_flow";

import { calculateHackathonScore } from "./utils/calculate_hackathon_score";

type Params = {
  baseUrl: string;
  playwrightPage: playwright.Page;
  puppeteerPage: puppeteer.Page;
};

export async function calculateDmChatFlowAction({
  baseUrl,
  playwrightPage,
  puppeteerPage,
}: Params) {
  consola.debug("DmChatFlowAction - navigate");
  try {
    await goTo({
      playwrightPage,
      puppeteerPage,
      timeout: 120 * 1000,
      url: new URL("/not-found", baseUrl).href,
    });
  } catch (err) {
    throw new Error("ページの読み込みに失敗したか、タイムアウトしました", { cause: err });
  }
  consola.debug("DmChatFlowAction - navigate end");

  // サインイン
  consola.debug("DmChatFlowAction - signin");
  try {
    const signinButton = playwrightPage.getByRole("button", { name: "サインイン" });
    await signinButton.click();
    await playwrightPage
      .getByRole("dialog")
      .getByRole("heading", { name: "サインイン" })
      .waitFor({ timeout: 10 * 1000 });
  } catch (err) {
    throw new Error("サインインモーダルの表示に失敗しました", { cause: err });
  }
  try {
    const usernameInput = playwrightPage
      .getByRole("dialog")
      .getByRole("textbox", { name: "ユーザー名" });
    await usernameInput.pressSequentially("o6yq16leo");
  } catch (err) {
    throw new Error("ユーザー名の入力に失敗しました", { cause: err });
  }
  try {
    const passwordInput = playwrightPage
      .getByRole("dialog")
      .getByRole("textbox", { name: "パスワード" });
    await passwordInput.pressSequentially("wsh-2026");
  } catch (err) {
    throw new Error("パスワードの入力に失敗しました", { cause: err });
  }
  try {
    const submitButton = playwrightPage
      .getByRole("dialog")
      .getByRole("button", { name: "サインイン" });
    await submitButton.click();
    await playwrightPage.getByRole("link", { name: "マイページ" }).waitFor({ timeout: 10 * 1000 });
  } catch (err) {
    throw new Error("サインインに失敗しました", { cause: err });
  }
  consola.debug("DmChatFlowAction - signin end");

  // DMページに移動
  consola.debug("DmChatFlowAction - navigate to DM");
  try {
    const dmLink = playwrightPage.getByRole("link", { name: "DM" });
    await dmLink.click();
    await playwrightPage.waitForURL("**/dm", { timeout: 10 * 1000 });
  } catch (err) {
    throw new Error("DMページへの遷移に失敗しました", { cause: err });
  }
  consola.debug("DmChatFlowAction - navigate to DM end");

  const flow = await startFlow(puppeteerPage);

  consola.debug("DmChatFlowAction - timespan");
  await flow.startTimespan();
  {
    const messageId = `${Date.now()}`;
    const firstMessage = `こんにちは ${messageId}`;

    try {
      await playwrightPage.getByRole("link", { name: "p72k8qi1c3" }).click();
      await playwrightPage.waitForURL("**/dm/*", { timeout: 10 * 1000 });
    } catch (err) {
      throw new Error("DMスレッドへの遷移に失敗しました", { cause: err });
    }

    // メッセージを入力（複数行）
    try {
      const messageInput = playwrightPage.getByRole("textbox", { name: "内容" });
      await messageInput.fill(firstMessage);
    } catch (err) {
      throw new Error("メッセージの入力に失敗しました", { cause: err });
    }

    // メッセージを送信
    try {
      await playwrightPage.keyboard.press("Enter");
    } catch (err) {
      throw new Error("メッセージの送信に失敗しました", { cause: err });
    }

    // メッセージが表示されるまで待機（送信完了確認）
    try {
      await playwrightPage.getByTestId("dm-message-list").locator("li").last().waitFor({
        timeout: 30 * 1000,
      });
      await playwrightPage
        .getByTestId("dm-message-list")
        .locator("li")
        .last()
        .filter({ hasText: firstMessage })
        .waitFor({ timeout: 30 * 1000 });
    } catch (err) {
      throw new Error("メッセージの送信完了を待機中にタイムアウトしました", { cause: err });
    }
  }
  await flow.endTimespan();
  consola.debug("DmChatFlowAction - timespan end");

  const {
    steps: [result],
  } = await flow.createFlowResult();

  const { breakdown, scoreX100 } = calculateHackathonScore(result!.lhr.audits, {
    isUserflow: true,
  });

  return {
    audits: result!.lhr.audits,
    breakdown,
    scoreX100,
  };
}
