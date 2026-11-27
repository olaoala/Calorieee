const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(path.resolve(__dirname, ".."));

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or the environment."
    );
  }

  const prompt = readline.createInterface({ input: stdin, output: stdout });
  try {
    const email = (await prompt.question("Email of the account to permanently delete: ")).trim();
    if (!email) throw new Error("An email address is required.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const matches = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw new Error(`Unable to list accounts: ${error.message}`);
      matches.push(
        ...data.users.filter(
          (user) => user.email?.toLowerCase() === email.toLowerCase()
        )
      );
      if (data.users.length < 100) break;
    }

    if (matches.length !== 1) {
      throw new Error(
        matches.length === 0
          ? "No account was found with that email."
          : "More than one account matched; no account was deleted."
      );
    }

    const user = matches[0];
    console.log(`\nAccount selected: ${user.email} (${user.id})`);
    console.log("Deleting this account also permanently deletes its associated app data.");
    const confirmation = await prompt.question(
      `Type the email exactly as shown to confirm: `
    );
    if (confirmation !== user.email) {
      throw new Error("Confirmation did not match; no account was deleted.");
    }

    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Unable to delete account: ${error.message}`);
    console.log(`Deleted account ${user.email}.`);
  } finally {
    prompt.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
