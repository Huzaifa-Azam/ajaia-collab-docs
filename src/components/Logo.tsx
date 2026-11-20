import { FileText } from "lucide-react";

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold text-gray-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">
        <FileText className="h-4 w-4" aria-hidden />
      </span>
      Ajaia Docs
    </span>
  );
}
