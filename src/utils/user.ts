export function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function getInitialsTwo(name: string, lastName: string): string {
  const a = name.trim().charAt(0) || "";
  const b = lastName.trim().charAt(0) || "";
  return (a + b).toUpperCase() || "U";
}

export function getAvatarGradient(id: number): string {
  const gradients = [
    "from-blue-500 to-indigo-600",
    "from-emerald-400 to-teal-600",
    "from-orange-400 to-rose-500",
    "from-purple-500 to-fuchsia-600",
    "from-cyan-400 to-blue-600",
  ];
  return gradients[id % gradients.length];
}
