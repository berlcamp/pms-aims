"use client";

export function Greeting({ name }: { name: string }) {
  const now = new Date();

  // Date
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Greeting
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-1">
      <div className="text-lg text-gray-700 dark:text-gray-400">{dateStr}</div>
      <div className="text-2xl font-semibold">
        {greeting}, {name}
      </div>
    </div>
  );
}
