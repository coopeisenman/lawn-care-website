// Sends customer login links.
//
// No email provider is connected yet (that needs a domain). Until then, on your own
// computer the link is printed in the terminal so logins can be tested. On the live
// site the request is accepted but no email is sent.
export async function sendLoginEmail(email: string, url: string) {
  if (process.env.NODE_ENV === "development") {
    console.log(`\n[login link for ${email}]\n${url}\n`);
    return;
  }
  console.warn(`Login link requested for ${email}, but email sending isn't set up yet.`);
}
