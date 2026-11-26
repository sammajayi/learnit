/** The "vote for LearnIt in the Flow Council" email, in the same layout as the stake-at-risk email. */
export const VOTE_APP_URL = "https://app.uselearnit.xyz";
export const VOTE_TELEGRAM_URL = "https://t.me/+X7qoy1SGH-I5YTc0";

export function voteEmail() {
  const subject = "Vote for LearnIt in GoodBuilders Season 5: how to vote";
  const home = `${VOTE_APP_URL}/home`;
  const logo = `${VOTE_APP_URL}/icon-512.png`;
  const p = "margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;";
  const li = "margin:0 0 6px;font-size:15px;line-height:1.6;color:#334155;";
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8f6f1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">It takes one tap on your home page.</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
            <tr>
              <td style="padding:0 4px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:10px;"><img src="${logo}" width="32" height="32" alt="" style="display:block;border-radius:9px;"></td>
                    <td style="vertical-align:middle;"><span style="font-size:16px;font-weight:700;color:#0f172a;letter-spacing:-0.2px;">LearnIt</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #e7e2d8;border-radius:16px;padding:32px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#a24a35;text-transform:uppercase;letter-spacing:0.08em;">GoodBuilders Season 5</p>
                <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:#0f172a;font-weight:600;letter-spacing:-0.02em;">Vote for LearnIt</h1>
                <p style="${p}">LearnIt is in GoodDollar's GoodBuilders Season 5. Verified GoodDollar members vote on which projects get funded, and your vote helps us keep building.</p>
                <p style="${p}">It takes about a minute:</p>
                <ol style="margin:0 0 20px;padding-left:20px;">
                  <li style="${li}">Open LearnIt. A <strong>Vote for LearnIt</strong> popup shows on your <strong>Home</strong> page.</li>
                  <li style="${li}">It keeps showing each time you visit, until you have voted.</li>
                  <li style="${li}">Tap the vote button. If it says "Claim votes and vote", tap that. Your wallet asks you to sign a free message, then your vote goes in.</li>
                </ol>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                  <tr>
                    <td style="border-radius:12px;background:#b9563e;">
                      <a href="${home}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">Open LearnIt</a>
                    </td>
                  </tr>
                </table>
                <p style="${p}">How much we can keep paying out depends on the votes we get, so every vote helps.</p>
                <p style="${p}">Need gas to vote, or have a question? Ask in our <a href="${VOTE_TELEGRAM_URL}" style="color:#b9563e;">Telegram group</a>.</p>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">Thank you for learning with us.<br>The LearnIt team</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 4px 0;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#5b6577;">You are getting this because you have a LearnIt account. To stop emails like this, reply with "unsubscribe".</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject, html };
}
