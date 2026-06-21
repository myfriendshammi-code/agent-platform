"use client";

import { useState } from "react";
import { Alert, Button, Card, Input, Label } from "@/components/ui/form";

export function SettingsForm({
  initialName,
  email,
}: {
  initialName?: string | null;
  email: string;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileMsg(null);

    const response = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setProfileMsg(response.ok ? "Profile updated" : "Update failed");
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMsg(null);

    const response = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (response.ok) {
      setPasswordMsg("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const data = (await response.json()) as { error?: string };
      setPasswordMsg(data.error ?? "Update failed");
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-lg font-semibold">Profile</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {profileMsg && <Alert variant={profileMsg.includes("updated") ? "success" : "error"}>{profileMsg}</Alert>}
          <Button type="submit">Save profile</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Change password</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          {passwordMsg && (
            <Alert variant={passwordMsg.includes("updated") ? "success" : "error"}>{passwordMsg}</Alert>
          )}
          <Button type="submit">Update password</Button>
        </form>
      </Card>
    </div>
  );
}
