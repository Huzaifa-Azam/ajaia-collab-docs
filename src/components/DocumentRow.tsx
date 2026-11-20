import Link from "next/link";
import { Eye, FileText, Pencil, Users } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { DeleteDocumentButton } from "./DeleteDocumentButton";

type Common = {
  id: string;
  title: string;
  updatedAt: Date;
  /** "you", another person's name, or null when unknown. */
  editedBy: string | null;
};

type Props =
  | (Common & { kind: "owned"; shareCount: number })
  | (Common & { kind: "shared"; role: "viewer" | "editor"; ownerName: string });

export function DocumentRow(props: Props) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
      <FileText className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
      <Link href={`/documents/${props.id}`} className="min-w-0 flex-1 rounded focus-visible:outline-2 focus-visible:outline-blue-500">
        <p className="truncate font-medium text-gray-900">{props.title}</p>
        <p className="truncate text-xs text-gray-500">
          {props.kind === "shared" && <>Owned by {props.ownerName} · </>}
          Edited {timeAgo(props.updatedAt)}
          {props.editedBy && !(props.kind === "shared" && props.editedBy === props.ownerName) && <> by {props.editedBy}</>}
        </p>
      </Link>
      {props.kind === "owned" ? (
        <>
          {props.shareCount > 0 && (
            <span className="hidden items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 sm:inline-flex">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Shared with {props.shareCount}
            </span>
          )}
          <DeleteDocumentButton id={props.id} title={props.title} />
        </>
      ) : (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            props.role === "editor" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          {props.role === "editor" ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
          {props.role === "editor" ? "Can edit" : "View only"}
        </span>
      )}
    </li>
  );
}
