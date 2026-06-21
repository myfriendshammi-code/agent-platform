import { auth } from "@/lib/auth/config";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Settings</h1>
      <SettingsForm initialName={session?.user?.name} email={session?.user?.email ?? ""} />
    </div>
  );
}
