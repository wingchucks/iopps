// Messaging components barrel export

// Drawer & context
export { default as MessageDrawer } from "./MessageDrawer";
export { MessageProvider, useMessageDrawer } from "./MessageContext";
export { default as UnreadMessageBadge } from "./UnreadMessageBadge";

// Existing components
export { default as ConversationList } from "./ConversationList";
export { default as MessageThread } from "./MessageThread";
export { default as PeerMessageThread } from "./PeerMessageThread";
export { default as NewMessageDialog } from "./NewMessageDialog";

// Hooks
export { useRealtimeConversations } from "./useRealtimeConversations";
export { useRealtimeMessages } from "./useRealtimeMessages";
