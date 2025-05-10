import dynamic from "next/dynamic";

const AutoPostPlanSetting = dynamic(
  () => import("@/components/settings/AutoPostPlanSetting"),
  { ssr: false }
);

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <AutoPostPlanSetting />
    </div>
  );
}
