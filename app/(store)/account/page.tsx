import { ProfileForm } from "@/components/store/profile-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();

  return (
    <>
      <h1 className="mb-4 text-2xl">Profile</h1>
      <p className="mb-4 text-sm">Signed in as {user.email}</p>
      <ProfileForm fullName={data?.full_name ?? ""} phone={data?.phone ?? ""} />
    </>
  );
}
