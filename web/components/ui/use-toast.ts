
import toast, { Toast } from "react-hot-toast"

type ToastProps = {
    title?: string
    description?: string
    variant?: "default" | "destructive"
}

export function useToast() {
    return {
        toast: ({ title, description, variant }: ToastProps) => {
            if (variant === "destructive") {
                toast.error(`${title ? title + ': ' : ''}${description || ''}`);
            } else {
                toast.success(`${title ? title + ': ' : ''}${description || ''}`);
            }
        }
    }
}
