import { createContentHandler } from "@/lib/api-content";
// Schools are listed as organizations, but their programs are posts
export const { GET, POST } = createContentHandler("program");
